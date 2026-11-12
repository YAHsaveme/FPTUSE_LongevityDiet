using System.Security.Claims;
using System.Text;
using LongevityDiet.Tracking;
using LongevityDiet.Tracking.Api;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var connection = builder.Configuration.GetConnectionString("Tracking")
    ?? throw new InvalidOperationException("Tracking requires its own database.");
if (!string.Equals(new SqlConnectionStringBuilder(connection).InitialCatalog,
    "LongevityTrackingDb", StringComparison.OrdinalIgnoreCase))
    throw new InvalidOperationException("Tracking may connect only to LongevityTrackingDb.");
var issuer = builder.Configuration["Jwt:Issuer"];
var audience = builder.Configuration["Jwt:Audience"];
var secret = builder.Configuration["Jwt:SigningKey"];
if (string.IsNullOrWhiteSpace(issuer) || string.IsNullOrWhiteSpace(audience) ||
    string.IsNullOrWhiteSpace(secret) || Encoding.UTF8.GetByteCount(secret) < 32)
    throw new InvalidOperationException("Tracking JWT issuer, audience, signing key required.");
var identityUrl = builder.Configuration["Identity:BaseUrl"]
    ?? throw new InvalidOperationException("Tracking Identity owner endpoint is required.");
if (!Uri.TryCreate(identityUrl, UriKind.Absolute, out var identityUri) ||
    (identityUri.Scheme != Uri.UriSchemeHttp && identityUri.Scheme != Uri.UriSchemeHttps) ||
    !string.IsNullOrWhiteSpace(identityUri.UserInfo) ||
    identityUri.AbsolutePath != "/" || !string.IsNullOrEmpty(identityUri.Query))
    throw new InvalidOperationException("Tracking Identity must be a fixed base URL.");

builder.Services.AddDbContext<TrackingDbContext>(o =>
    o.UseSqlServer(connection, sql => sql.EnableRetryOnFailure()));
builder.Services.AddHttpContextAccessor();
builder.Services.AddHttpClient("identity", c =>
{
    c.BaseAddress = identityUri;
    c.Timeout = TimeSpan.FromSeconds(4);
});
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<IdentityHttpTrackingUserContext>();
builder.Services.AddScoped<ITrackingUserContext>(sp =>
    sp.GetRequiredService<IdentityHttpTrackingUserContext>());
builder.Services.AddScoped<TrackingService>();
builder.Services.AddScoped<TrackingMealOwnerService>();
if (string.IsNullOrWhiteSpace(builder.Configuration["Redis:ConnectionString"]))
    throw new InvalidOperationException("Tracking Redis connection required.");
builder.Services.AddHostedService<TrackingOutboxPublisher>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, ValidIssuer = issuer,
            ValidateAudience = true, ValidAudience = audience,
            ValidateLifetime = true, ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = ClaimTypes.Name, RoleClaimType = ClaimTypes.Role
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddProblemDetails();
var app = builder.Build();
app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();
if (app.Environment.IsDevelopment())
{
    await using var scope = app.Services.CreateAsyncScope();
    await scope.ServiceProvider.GetRequiredService<TrackingDbContext>()
        .Database.MigrateAsync();
}
app.MapGet("/health", () => Results.Ok(new { service = "tracking", status = "alive" }));
app.MapGet("/ready", async (TrackingDbContext db, CancellationToken ct) =>
{
    try
    {
        _ = await db.Activities.AsNoTracking().AnyAsync(ct);
        return Results.Ok(new { service = "tracking", database = "LongevityTrackingDb", status = "ready" });
    }
    catch (Exception) { return Results.StatusCode(StatusCodes.Status503ServiceUnavailable); }
});
var api = app.MapGroup("/api/v1").RequireAuthorization();
api.MapTrackingEndpoints();
api.MapMealOwnerEndpoints();
app.Run();
public partial class Program;
