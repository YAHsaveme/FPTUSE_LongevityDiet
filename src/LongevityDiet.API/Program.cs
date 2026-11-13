using System.Globalization;
using System.Diagnostics;
using System.Threading.RateLimiting;
using System.Text;
using LongevityDiet.API.Cloudflare;
using LongevityDiet.API.Infrastructure;
using LongevityDiet.API.OpenApi;
using LongevityDiet.API.Recommendation;
using LongevityDiet.API.Security;
using LongevityDiet.API.Reminders;
using Microsoft.AspNetCore.RateLimiting;
using Serilog.Context;
using LongevityDiet.Domain.Entities;
using LongevityDiet.Repositories;
using LongevityDiet.Repositories.Catalog.Repositories;
using LongevityDiet.Repositories.Catalog.Seed;
using LongevityDiet.Repositories.Repositories;
using LongevityDiet.Repositories.Seed;
using LongevityDiet.Services.Catalog;
using LongevityDiet.Services.Identity;
using LongevityDiet.Services.Reminders;
using LongevityDiet.Tracking;
using LongevityDiet.Recommendation.Contracts;
using Microsoft.Data.SqlClient;
using LongevityDiet.Services.Fmd;
using LongevityDiet.Services.Planning;
using LongevityDiet.Services.Recommendation;
using LongevityDiet.Services.Tracking;
using LongevityDiet.Services.Wellness;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .Enrich.FromLogContext()
    .WriteTo.Console(formatProvider: CultureInfo.InvariantCulture)
    .CreateLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);
    builder.Host.UseSerilog();

    var connectionString = builder.Configuration.GetConnectionString("Default")
        ?? throw new InvalidOperationException("ConnectionStrings:Default is required.");

    var jwtOptions = builder.Configuration
        .GetSection(JwtOptions.SectionName)
        .Get<JwtOptions>()
        ?? throw new InvalidOperationException("Jwt configuration is required.");

    if (string.IsNullOrWhiteSpace(jwtOptions.SigningKey) || jwtOptions.SigningKey.Length < 32)
    {
        throw new InvalidOperationException("Jwt:SigningKey must contain at least 32 characters.");
    }

    builder.Services.AddControllers();
    builder.Services.AddOpenApi(options =>
    {
        options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
        options.AddOperationTransformer<AuthorizeOperationTransformer>();
    });
    var readinessTags = new[] { "ready" };
    builder.Services.AddProblemDetails(options =>
    {
        options.CustomizeProblemDetails = context =>
            context.ProblemDetails.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
    });
    builder.Services.AddHealthChecks()
        .AddCheck<LongevityDiet.API.Security.ReadinessCheck>("dependencies",
            tags: readinessTags);
    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        options.AddPolicy("auth", context =>
            RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "local",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 40, QueueLimit = 0,
                    Window = TimeSpan.FromMinutes(1),
                    AutoReplenishment = true,
                }));
        options.AddPolicy("member-api", context =>
            RateLimitPartition.GetFixedWindowLimiter(
                context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ??
                    context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 150, QueueLimit = 0,
                    Window = TimeSpan.FromMinutes(1),
                    AutoReplenishment = true,
                }));
        options.OnRejected = async (context, cancellationToken) =>
        {
            var response = context.HttpContext.Response;
            response.StatusCode = StatusCodes.Status429TooManyRequests;
            response.Headers.RetryAfter = "60";
            response.ContentType = "application/problem+json";
            await response.WriteAsync(
                "{\"type\":\"about:blank\",\"title\":\"rate_limited\",\"status\":429,\"detail\":\"Request rate limit exceeded. Please retry later.\"}",
                cancellationToken);
        };
    });
    builder.Services.AddHttpContextAccessor();

    builder.Services.AddDbContext<LongevityDietDbContext>(options =>
        options.UseSqlServer(
            connectionString,
            sql => sql.EnableRetryOnFailure()));

    // Transitional single-host adapter. Tracking gets an independent DbContext
    // and separate SQL catalog, never the Identity DbContext.
    var trackingConnection = builder.Configuration.GetConnectionString("Tracking");
    if (string.IsNullOrWhiteSpace(trackingConnection))
    {
        var connection = new SqlConnectionStringBuilder(connectionString)
        {
            InitialCatalog = "LongevityTrackingDb",
        };
        trackingConnection = connection.ConnectionString;
    }

    builder.Services.AddDbContext<TrackingDbContext>(options =>
        options.UseSqlServer(trackingConnection, sql => sql.EnableRetryOnFailure()));
    builder.Services.AddScoped<ITrackingUserContext, IdentityTrackingUserContext>();
    builder.Services.AddScoped<ITrackingDailySignalSource, MainDbTrackingDailySignalSource>();
    builder.Services.AddScoped<TrackingService>();

    // Resolve the final configuration via DI, including host-level test overrides.
    // Only aggregate activity counts are sent to the independent gRPC service.
    builder.Services.AddGrpcClient<ActivityCoach.ActivityCoachClient>((services, options) =>
    {
        var configuration = services.GetRequiredService<IConfiguration>();
        var recommendationUrl = configuration["Grpc:RecommendationUrl"];
        if (string.IsNullOrWhiteSpace(recommendationUrl) &&
            services.GetRequiredService<IHostEnvironment>().IsEnvironment("Testing"))
            recommendationUrl = "http://localhost:5010";
        if (!Uri.TryCreate(recommendationUrl, UriKind.Absolute, out var address) ||
            address.Scheme is not ("http" or "https") ||
            !string.IsNullOrEmpty(address.UserInfo))
            throw new InvalidOperationException("Grpc:RecommendationUrl must be an absolute HTTP(S) address.");
        options.Address = address;
    });

    builder.Services.AddScoped<IUserRepository, UserRepository>();
    // Default SQL persistence is intentionally unchanged until Cloudflare D1
    // has been provisioned, migrated, authenticated, and E2E verified.
    var cloudflareSessions = builder.Configuration
        .GetSection(CloudflareSessionOptions.SectionName)
        .Get<CloudflareSessionOptions>() ?? new CloudflareSessionOptions();

    builder.Services.Configure<CloudflareSessionOptions>(
        builder.Configuration.GetSection(CloudflareSessionOptions.SectionName));

    if (cloudflareSessions.Enabled)
    {
        if (!Uri.TryCreate(cloudflareSessions.BaseUrl, UriKind.Absolute, out var remote) ||
            remote.Scheme != Uri.UriSchemeHttps ||
            remote.AbsolutePath != "/" ||
            !string.IsNullOrEmpty(remote.UserInfo) ||
            !string.IsNullOrWhiteSpace(remote.Query) ||
            !string.IsNullOrWhiteSpace(remote.Fragment) ||
            string.IsNullOrWhiteSpace(cloudflareSessions.ServiceBearer) ||
            cloudflareSessions.ServiceBearer.Length < 32)
        {
            throw new InvalidOperationException(
                "CloudflareSessions requires a root HTTPS BaseUrl and ServiceBearer secret (at least 32 characters).");
        }

        builder.Services.AddHttpClient<IRefreshTokenRepository, CloudflareRefreshTokenRepository>(
            client =>
            {
                client.BaseAddress = remote;
                client.Timeout = TimeSpan.FromSeconds(5);
            });
    }
    else
    {
        builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
    }
    builder.Services.AddScoped<IFoodRepository, FoodRepository>();
    builder.Services.AddScoped<IRecipeRepository, RecipeRepository>();
    builder.Services.AddScoped<IRuleCatalogRepository, RuleCatalogRepository>();
    builder.Services.AddScoped<AuthenticationService>();
    builder.Services.AddScoped<ProfileService>();
    builder.Services.AddScoped<ReminderService>();
    builder.Services.AddTransient<LongevityDiet.API.Security.ReadinessCheck>();
    if (!builder.Environment.IsEnvironment("Testing"))
        builder.Services.AddHostedService<IdentityRedisBridge>();
    builder.Services.AddSingleton<WebPushSubscriptionStore>();
    builder.Services.AddScoped<EmailVerificationService>();
    // Refuse to start an enabled OTP service with a missing signing key,
    // unauthenticated SMTP or an incompatible email delivery configuration.
    EmailVerificationService.EnsureConfigured(builder.Configuration, builder.Environment);
    // Real background Web Push is opt-in, separately from SMTP and in-app alerts.
    // VAPID private key is read from deployment secrets and never returned to UI.
    if (builder.Configuration.GetValue<bool>("WebPush:Enabled"))
    {
        _ = WebPushSubscriptionStore.Config(builder.Configuration);
        if (!builder.Environment.IsEnvironment("Testing"))
            builder.Services.AddHostedService<WebPushReminderHostedService>();
    }
    // Delivery is strictly opt-in; no Gmail/SMTP traffic in the default runtime.
    if (builder.Configuration.GetValue<bool>("EmailNotifications:Enabled"))
    {
        _ = EmailDeliveryConfiguration.Read(builder.Configuration, builder.Environment);
        if (!builder.Environment.IsEnvironment("Testing"))
            builder.Services.AddHostedService<RabbitEmailNotificationService>();
    }
    builder.Services.AddScoped<IMealPlanRepository, MealPlanRepository>();
    builder.Services.AddScoped<IWellnessRepository, WellnessRepository>();
    builder.Services.AddScoped<IRecommendationRepository, RecommendationRepository>();
    builder.Services.AddScoped<IFmdRepository, FmdRepository>();
    builder.Services.AddScoped<IMealLogRepository, MealLogRepository>();
    builder.Services.AddScoped<IEatingWindowRepository, EatingWindowRepository>();
    builder.Services.AddScoped<IChallengeProgressRepository, ChallengeProgressRepository>();
    builder.Services.AddScoped<IWeeklyReportWorkerRepository, WeeklyReportWorkerRepository>();
    builder.Services.AddScoped<IPlanningInputProvider, PlanningCatalogSnapshotProvider>();
    builder.Services.AddScoped<ITrackingUserScheduleProvider, TrackingUserScheduleProvider>();
    builder.Services.AddSingleton<IRecommendationEngineClient, GrpcRecommendationEngineClient>();
    builder.Services.AddScoped<SafeExplanationRewriter>();
    builder.Services.AddScoped<FoodCatalogService>();
    builder.Services.AddScoped<RecipeCatalogService>();
    builder.Services.AddScoped<RuleCatalogService>();
    builder.Services.AddScoped<MealPlanningService>();
    builder.Services.AddScoped<WellnessJourneyService>();
    builder.Services.AddScoped<RecommendationService>();
    builder.Services.AddScoped<FmdService>();
    builder.Services.AddScoped<MealTrackingService>();
    builder.Services.AddScoped<ChallengeProgressService>();
    builder.Services.AddScoped<WeeklyReportService>();
    builder.Services.AddScoped<WorkerReliabilityService>();
    builder.Services.AddScoped<WeeklyReportStreamPublisher>();
    builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
    builder.Services.AddScoped<IAccessTokenProvider, JwtAccessTokenProvider>();
    builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();
    builder.Services.AddSingleton(TimeProvider.System);

    builder.Services.Configure<JwtOptions>(
        builder.Configuration.GetSection(JwtOptions.SectionName));
    builder.Services.Configure<AuthenticationOptions>(
        builder.Configuration.GetSection(AuthenticationOptions.SectionName));

    builder.Services
        .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.MapInboundClaims = false;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = jwtOptions.Issuer,
                ValidateAudience = true,
                ValidAudience = jwtOptions.Audience,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromSeconds(30),
                NameClaimType = System.Security.Claims.ClaimTypes.Name,
                RoleClaimType = System.Security.Claims.ClaimTypes.Role,
            };
        });

    builder.Services.AddAuthorization(AuthorizationPolicies.Configure);

    var app = builder.Build();

    if (app.Environment.IsDevelopment())
    {
        await using var scope = app.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<LongevityDietDbContext>();
        await dbContext.Database.MigrateAsync();
        var trackingDb = scope.ServiceProvider.GetRequiredService<TrackingDbContext>();
        await trackingDb.Database.MigrateAsync();
        await CatalogSeed.SeedAsync(dbContext);
        await ChallengeSeed.SeedAsync(dbContext);
    }

    app.Use(async (httpContext, next) =>
    {
        var incoming = httpContext.Request.Headers["X-Correlation-ID"].ToString();
        var safe = incoming.Length is > 0 and <= 64 && incoming.All(ch =>
            ch is >= 'a' and <= 'z' or >= 'A' and <= 'Z' or >= '0' and <= '9' or '-' or '_');
        var correlation = safe ? incoming : Guid.NewGuid().ToString("N");
        httpContext.TraceIdentifier = correlation;
        httpContext.Response.Headers["X-Correlation-ID"] = correlation;
        Activity.Current?.SetTag("correlation.id", correlation);
        using (LogContext.PushProperty("CorrelationId", correlation))
        {
            await next(httpContext);
        }
    });
    app.UseSerilogRequestLogging();
    app.UseExceptionHandler();

    if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))
    {
        app.MapOpenApi();
    }

    if (app.Environment.IsDevelopment())
    {
        app.UseSwaggerUI(options =>
        {
            options.SwaggerEndpoint("/openapi/v1.json", "Longevity Diet API v1");
            options.RoutePrefix = "swagger";
            options.DocumentTitle = "Longevity Diet API";
        });
    }

    app.UseHttpsRedirection();
    app.UseRouting();
    app.UseAuthentication();
    app.UseRateLimiter();
    app.UseAuthorization();

    app.MapHealthChecks("/health", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
    {
        Predicate = _ => false, // liveness: process responds, no dependency required
    });
    app.MapHealthChecks("/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
    {
        Predicate = check => check.Tags.Contains("ready"), // actual dependencies
    });
    app.MapControllers();

    app.Run();
}
catch (HostAbortedException)
{
    // Expected when EF Core design-time tooling stops the host after resolving services.
}
catch (Exception ex)
{
    Log.Fatal(ex, "LongevityDiet.API terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

public partial class Program;
