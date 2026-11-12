using System.Security.Claims;
using System.Text;
using Grpc.AspNetCore.Server.Model;
using LongevityDiet.Recommendation.Grpc.Ownership;
using LongevityDiet.Recommendation.Grpc.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddGrpc();
builder.Services.AddSingleton<IServiceMethodProvider<RecommendationProtoGrpcService>,
    RecommendationEnvelopeMethodProvider>();
builder.Services.AddHealthChecks();

// Legacy gRPC remains unchanged when the optional Recommendation owner overlay
// is NOT enabled. Never connect the gRPC default process to the shared SQL DB.
var ownerConnection = builder.Configuration.GetConnectionString("Recommendation");
if (!string.IsNullOrWhiteSpace(ownerConnection))
{
    if (!string.Equals(new SqlConnectionStringBuilder(ownerConnection).InitialCatalog,
        "LongevityRecommendationDb", StringComparison.OrdinalIgnoreCase))
        throw new InvalidOperationException(
            "Recommendation owner may connect only to LongevityRecommendationDb.");

    var jwtIssuer = builder.Configuration["Jwt:Issuer"];
    var jwtAudience = builder.Configuration["Jwt:Audience"];
    var jwtKey = builder.Configuration["Jwt:SigningKey"];
    if (string.IsNullOrWhiteSpace(jwtIssuer) ||
        string.IsNullOrWhiteSpace(jwtAudience) ||
        string.IsNullOrWhiteSpace(jwtKey) ||
        Encoding.UTF8.GetByteCount(jwtKey) < 32)
        throw new InvalidOperationException("Recommendation owner JWT config is required.");
    if (string.IsNullOrWhiteSpace(builder.Configuration["Redis:ConnectionString"]))
        throw new InvalidOperationException("Recommendation owner Redis config is required.");

    var identityAddress = builder.Configuration["Identity:BaseUrl"];
    if (!Uri.TryCreate(identityAddress, UriKind.Absolute, out var identityUri) ||
        (identityUri.Scheme != Uri.UriSchemeHttp &&
            identityUri.Scheme != Uri.UriSchemeHttps) ||
        !string.IsNullOrEmpty(identityUri.UserInfo) ||
        identityUri.AbsolutePath != "/" ||
        !string.IsNullOrEmpty(identityUri.Query))
        throw new InvalidOperationException(
            "Recommendation Identity must be a fixed service base URL.");

    builder.Services.AddDbContext<RecommendationDbContext>(o =>
        o.UseSqlServer(ownerConnection, sql => sql.EnableRetryOnFailure()));
    builder.Services.AddSingleton(TimeProvider.System);
    builder.Services.AddHttpContextAccessor();
    builder.Services.AddScoped<RecommendationActorVerifier>();
    builder.Services.AddHttpClient("identity", client =>
    {
        client.BaseAddress = identityUri;
        client.Timeout = TimeSpan.FromSeconds(4);
    });
    builder.Services.AddHostedService<RecommendationOutboxPublisher>();
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.MapInboundClaims = false;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true, ValidIssuer = jwtIssuer,
                ValidateAudience = true, ValidAudience = jwtAudience,
                ValidateLifetime = true, ValidateIssuerSigningKey = true,
                IssuerSigningKey =
                    new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                ClockSkew = TimeSpan.FromSeconds(30),
                NameClaimType = ClaimTypes.Name,
                RoleClaimType = ClaimTypes.Role
            };
        });
    builder.Services.AddAuthorization();
    builder.Services.AddProblemDetails();
}

var app = builder.Build();
app.MapHealthChecks("/health");
app.MapGrpcService<RecommendationProtoGrpcService>();
app.MapGrpcService<ActivityCoachEndpoint>();

if (!string.IsNullOrWhiteSpace(ownerConnection))
{
    app.UseExceptionHandler();
    app.UseAuthentication();
    app.UseAuthorization();

    if (app.Environment.IsDevelopment())
    {
        await using var scope = app.Services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<RecommendationDbContext>()
            .Database.MigrateAsync();
    }
    app.MapGet("/ready", async (RecommendationDbContext db, CancellationToken ct) =>
    {
        try
        {
            _ = await db.Feedback.AsNoTracking().AnyAsync(ct);
            return Results.Ok(new { service = "recommendation",
                database = "LongevityRecommendationDb", status = "ready" });
        }
        catch (Exception)
        {
            return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
        }
    });

    app.MapGroup("/api/v1").RequireAuthorization().MapRecommendationOwnerEndpoints();
}

app.MapGet("/", () => Results.Ok(new
{
    service = "LongevityDiet.Recommendation.Grpc",
    status = "ready",
    version = "2026-04-v2",
    contract = "longevitydiet.recommendation.v2.RecommendationProtoService",
    legacyContract = "longevity.recommendation.v1.ActivityCoach/Recommend",
    transport = "gRPC over HTTP/2"
}));

app.Run();

public partial class Program;
