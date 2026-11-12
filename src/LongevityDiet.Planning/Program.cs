using System.Security.Claims;
using System.Text;
using LongevityDiet.Planning;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var connection = builder.Configuration.GetConnectionString("Planning")
    ?? throw new InvalidOperationException("Planning connection string required.");
if (!string.Equals(new SqlConnectionStringBuilder(connection).InitialCatalog,
    "LongevityPlanningDb", StringComparison.OrdinalIgnoreCase))
    throw new InvalidOperationException("Planning may connect only to LongevityPlanningDb.");

var issuer = builder.Configuration["Jwt:Issuer"];
var audience = builder.Configuration["Jwt:Audience"];
var secret = builder.Configuration["Jwt:SigningKey"];
if (string.IsNullOrWhiteSpace(issuer) || string.IsNullOrWhiteSpace(audience) ||
    string.IsNullOrWhiteSpace(secret) || Encoding.UTF8.GetByteCount(secret) < 32)
    throw new InvalidOperationException("Planning JWT issuer, audience and signing key are required.");

builder.Services.AddDbContext<PlanningDbContext>(o =>
    o.UseSqlServer(connection, sql => sql.EnableRetryOnFailure()));
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
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddHostedService<PlanningOutboxPublisher>();

var app = builder.Build();
app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    await using var scope = app.Services.CreateAsyncScope();
    await scope.ServiceProvider.GetRequiredService<PlanningDbContext>()
        .Database.MigrateAsync();
}

app.MapGet("/health", () => Results.Ok(new { service = "planning", status = "alive" }));
app.MapGet("/ready", async (PlanningDbContext db, CancellationToken ct) =>
{
    try
    {
        _ = await db.MealPlans.AsNoTracking().AnyAsync(ct);
        return Results.Ok(new { service = "planning", database = "LongevityPlanningDb", status = "ready" });
    }
    catch (Exception) { return Results.StatusCode(StatusCodes.Status503ServiceUnavailable); }
});

var api = app.MapGroup("/api/v1").RequireAuthorization();
api.MapPlanningOwnerEndpoints();
api.MapPlanningChallengeEndpoints();

app.Run();
public partial class Program;
