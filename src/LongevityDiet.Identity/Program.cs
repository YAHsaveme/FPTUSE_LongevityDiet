using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using LongevityDiet.Domain.Entities;
using LongevityDiet.Identity;
using LongevityDiet.Repositories.Repositories;
using LongevityDiet.Services.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var connection = builder.Configuration.GetConnectionString("Identity")
    ?? throw new InvalidOperationException("Identity connection string is required.");
if (!string.Equals(new SqlConnectionStringBuilder(connection).InitialCatalog,
    "LongevityIdentityDb", StringComparison.OrdinalIgnoreCase))
    throw new InvalidOperationException("Identity may connect only to LongevityIdentityDb.");

var jwt = builder.Configuration.GetSection("Jwt").Get<IdentityJwtOptions>()
    ?? throw new InvalidOperationException("Identity JWT configuration missing.");
if (string.IsNullOrWhiteSpace(jwt.Issuer) || string.IsNullOrWhiteSpace(jwt.Audience) ||
    string.IsNullOrWhiteSpace(jwt.SigningKey) || Encoding.UTF8.GetByteCount(jwt.SigningKey) < 32)
    throw new InvalidOperationException("Identity trusted JWT issuer/audience/key required.");

builder.Services.Configure<IdentityJwtOptions>(builder.Configuration.GetSection("Jwt"));
builder.Services.Configure<AuthenticationOptions>(builder.Configuration.GetSection("Authentication"));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddDbContext<IdentityDbContext>(o =>
    o.UseSqlServer(connection, sql => sql.EnableRetryOnFailure()));
builder.Services.AddScoped<IUserRepository, IdentityUserRepository>();
builder.Services.AddScoped<IRefreshTokenRepository, IdentityRefreshTokenRepository>();
builder.Services.AddScoped<AuthenticationService>();
builder.Services.AddScoped<IAccessTokenProvider, IdentityJwtProvider>();
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
if (string.IsNullOrWhiteSpace(builder.Configuration["Redis:ConnectionString"]))
    throw new InvalidOperationException("Identity Redis connection is required for event delivery.");
builder.Services.AddHostedService<IdentityOutboxPublisher>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, ValidIssuer = jwt.Issuer,
            ValidateAudience = true, ValidAudience = jwt.Audience,
            ValidateLifetime = true, ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = ClaimTypes.Name, RoleClaimType = ClaimTypes.Role
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddProblemDetails();
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("identity-auth", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "local",
        _ => new FixedWindowRateLimiterOptions
        { PermitLimit = 40, QueueLimit = 0, Window = TimeSpan.FromMinutes(1), AutoReplenishment = true }));
});
var app = builder.Build();
app.UseExceptionHandler();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    await using var scope = app.Services.CreateAsyncScope();
    await scope.ServiceProvider.GetRequiredService<IdentityDbContext>().Database.MigrateAsync();
}
app.MapGet("/health", () => Results.Ok(new { service = "identity", status = "alive" }));
app.MapGet("/ready", async (IdentityDbContext db, CancellationToken ct) =>
{
    try
    {
        _ = await db.Users.AsNoTracking().AnyAsync(ct);
        return Results.Ok(new { service = "identity", database = "LongevityIdentityDb", status = "ready" });
    }
    catch (Exception) { return Results.StatusCode(StatusCodes.Status503ServiceUnavailable); }
});

const string cookieName = "ldc_refresh";
var auth = app.MapGroup("/api/v1/auth").RequireRateLimiting("identity-auth");
auth.MapPost("/register", async (RegisterIdentityRequest input, AuthenticationService service,
    HttpContext http, CancellationToken ct) =>
{
    if (!ValidEmail(input.Email) || string.IsNullOrWhiteSpace(input.Password) ||
        input.Password.Length > 200 || string.IsNullOrWhiteSpace(input.DisplayName) ||
        input.DisplayName.Trim().Length is < 2 or > 120)
        return Results.BadRequest(new { error = "invalid_registration" });
    try
    {
        var result = await service.RegisterAsync(new(input.Email!, input.Password!,
            input.DisplayName!), ct);
        if (!result.Succeeded) return Error(result);
        SetCookie(http, result.Value!);
        return Results.Json(ToSession(result.Value!), statusCode: StatusCodes.Status201Created);
    }
    catch (DbUpdateException)
    {
        return Results.Conflict(new { error = "account_conflict" });
    }
});
auth.MapPost("/login", async (LoginIdentityRequest input, AuthenticationService service,
    HttpContext http, CancellationToken ct) =>
{
    if (!ValidEmail(input.Email) || string.IsNullOrWhiteSpace(input.Password) ||
        input.Password.Length > 200)
        return Results.BadRequest(new { error = "invalid_credentials" });
    var result = await service.LoginAsync(new(input.Email!, input.Password!), ct);
    if (!result.Succeeded) return Error(result);
    SetCookie(http, result.Value!);
    return Results.Ok(ToSession(result.Value!));
});
auth.MapPost("/refresh", async (HttpContext http, AuthenticationService service,
    CancellationToken ct) =>
{
    http.Request.Cookies.TryGetValue(cookieName, out var token);
    var result = await service.RefreshAsync(token ?? string.Empty, ct);
    if (!result.Succeeded)
    {
        ClearCookie(http);
        return Results.Unauthorized();
    }
    SetCookie(http, result.Value!);
    return Results.Ok(ToSession(result.Value!));
});
auth.MapPost("/revoke", async (HttpContext http, AuthenticationService service,
    CancellationToken ct) =>
{
    http.Request.Cookies.TryGetValue(cookieName, out var token);
    await service.RevokeAsync(token, ct);
    ClearCookie(http);
    return Results.NoContent();
});

var api = app.MapGroup("/api/v1").RequireAuthorization();
api.MapProfileOwnerEndpoints();
app.Run();

static bool ValidEmail(string? email) => !string.IsNullOrWhiteSpace(email) &&
    email.Length <= 320 && new EmailAddressAttribute().IsValid(email);

static IResult Error<T>(ServiceResult<T> result) => result.ErrorCode switch
{
    "email_exists" => Results.Conflict(new { error = result.ErrorCode }),
    "account_disabled" => Results.Json(new { error = result.ErrorCode }, statusCode: 403),
    "invalid_credentials" or "invalid_refresh_token" => Results.Unauthorized(),
    _ => Results.BadRequest(new { error = result.ErrorCode, detail = result.ErrorMessage })
};

static object ToSession(AuthenticatedSession s) => new
{
    s.AccessToken, s.AccessTokenExpiresAt,
    User = new { s.User.Id, s.User.Email, s.User.DisplayName, s.User.Role,
        s.User.ProfileCompleted }
};
static CookieOptions CookieOpts(HttpContext context, DateTimeOffset? expiration = null) => new()
{
    HttpOnly = true, SameSite = SameSiteMode.Strict, Path = "/api/v1/auth",
    Secure = context.Request.IsHttps ||
        !context.RequestServices.GetRequiredService<IHostEnvironment>().IsDevelopment(),
    Expires = expiration, IsEssential = true
};
static void SetCookie(HttpContext ctx, AuthenticatedSession session) =>
    ctx.Response.Cookies.Append(cookieName, session.RefreshToken,
        CookieOpts(ctx, session.RefreshTokenExpiresAt));
static void ClearCookie(HttpContext ctx) =>
    ctx.Response.Cookies.Delete(cookieName, CookieOpts(ctx));

namespace LongevityDiet.Identity
{
    public sealed record RegisterIdentityRequest(string? Email, string? Password, string? DisplayName);
    public sealed record LoginIdentityRequest(string? Email, string? Password);
}
public partial class Program;
