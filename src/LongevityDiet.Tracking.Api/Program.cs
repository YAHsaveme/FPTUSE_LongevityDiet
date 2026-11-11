using System.Security.Claims;
using System.Text;
using LongevityDiet.Tracking;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var connection = builder.Configuration.GetConnectionString("Tracking");
if (string.IsNullOrWhiteSpace(connection) ||
    !string.Equals(new SqlConnectionStringBuilder(connection).InitialCatalog,
        "LongevityTrackingDb", StringComparison.OrdinalIgnoreCase))
    throw new InvalidOperationException("Tracking REST may connect only to LongevityTrackingDb.");

var issuer = builder.Configuration["Jwt:Issuer"];
var audience = builder.Configuration["Jwt:Audience"];
var key = builder.Configuration["Jwt:SigningKey"];
if (string.IsNullOrWhiteSpace(issuer) || string.IsNullOrWhiteSpace(audience) ||
    string.IsNullOrWhiteSpace(key) || Encoding.UTF8.GetByteCount(key) < 32)
    throw new InvalidOperationException("Tracking REST requires trusted JWT issuer/audience/signing key.");

builder.Services.AddDbContext<TrackingDbContext>(options =>
    options.UseSqlServer(connection, sql => sql.EnableRetryOnFailure()));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = issuer,
            ValidateAudience = true,
            ValidAudience = audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = ClaimTypes.Name,
            RoleClaimType = ClaimTypes.Role
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddProblemDetails();

var app = builder.Build();
app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();

// TrackingDbContext has its own migrations and never reads the legacy MainDb.
// The current REST host also uses this same owned database temporarily.
if (app.Environment.IsDevelopment())
{
    await using var scope = app.Services.CreateAsyncScope();
    await scope.ServiceProvider.GetRequiredService<TrackingDbContext>().Database.MigrateAsync();
}

app.MapGet("/health", () => Results.Ok(new { service = "tracking", status = "alive" }));
app.MapGet("/ready", async (TrackingDbContext db, CancellationToken ct) =>
{
    try
    {
        _ = await db.Activities.AsNoTracking().AnyAsync(ct);
        return Results.Ok(new { service = "tracking", database = "LongevityTrackingDb", status = "ready" });
    }
    catch (Exception)
    {
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }
});

var api = app.MapGroup("/api/v1").RequireAuthorization();
api.MapGet("/activities", async (ClaimsPrincipal principal, TrackingDbContext db,
    int page = 1, int pageSize = 20,
    DateTimeOffset? from = null, DateTimeOffset? to = null,
    CancellationToken ct = default) =>
{
    if (!TryUserId(principal, out var userId)) return Results.Unauthorized();
    if (!ValidPagination(page, pageSize) || (from.HasValue && to.HasValue && from > to))
        return Results.BadRequest(new { error = "invalid_query" });

    var query = db.Activities.AsNoTracking().Where(a => a.UserId == userId && !a.IsDeleted);
    if (from.HasValue) query = query.Where(a => a.StartedAtUtc >= from.Value.UtcDateTime);
    if (to.HasValue) query = query.Where(a => a.StartedAtUtc <= to.Value.UtcDateTime);
    var count = await query.CountAsync(ct);
    var items = await query.OrderByDescending(a => a.StartedAtUtc).ThenBy(a => a.Id)
        .Skip((page - 1) * pageSize).Take(pageSize)
        .Select(a => new { a.Id, a.Kind, StartedAt = a.StartedAtUtc,
            a.DurationMinutes, a.Note }).ToListAsync(ct);
    return Results.Ok(new { items, page, pageSize, totalItems = count,
        totalPages = (count + pageSize - 1) / pageSize });
});

api.MapGet("/activities/{id:guid}", async (Guid id, ClaimsPrincipal principal,
    TrackingDbContext db, CancellationToken ct) =>
{
    if (!TryUserId(principal, out var userId)) return Results.Unauthorized();
    var item = await db.Activities.AsNoTracking().Where(a => a.Id == id &&
        a.UserId == userId && !a.IsDeleted)
        .Select(a => new { a.Id, a.Kind, StartedAt = a.StartedAtUtc,
            a.DurationMinutes, a.Note }).FirstOrDefaultAsync(ct);
    return item is null ? Results.NotFound() : Results.Ok(item);
});

api.MapGet("/activities/goal", async (ClaimsPrincipal principal,
    TrackingDbContext db, CancellationToken ct) =>
{
    if (!TryUserId(principal, out var userId)) return Results.Unauthorized();
    var goal = await db.Goals.AsNoTracking().Where(g => g.UserId == userId)
        .Select(g => new { g.WeeklyMinutesTarget, g.WeeklyStrengthSessionsTarget,
            g.UpdatedAtUtc }).FirstOrDefaultAsync(ct);
    return Results.Ok(goal ?? new
    {
        WeeklyMinutesTarget = 150,
        WeeklyStrengthSessionsTarget = 2,
        UpdatedAtUtc = DateTimeOffset.MinValue
    });
});

api.MapGet("/ldas/latest", async (ClaimsPrincipal principal, TrackingDbContext db, CancellationToken ct) =>
{
    if (!TryUserId(principal, out var userId)) return Results.Unauthorized();
    var snapshot = await db.Scores.AsNoTracking().Where(s => s.UserId == userId)
        .OrderByDescending(s => s.LocalDate).ThenByDescending(s => s.CalculatedAtUtc)
        .Select(s => new { s.LocalDate, s.Version, s.Score, s.CoveragePercent,
            s.IsPartial, s.MissingDataJson, s.CalculatedAtUtc }).FirstOrDefaultAsync(ct);
    // Never compute a fake score from missing MainDb meal/window observations.
    return snapshot is null ? Results.NotFound() : Results.Ok(snapshot);
});

api.MapGet("/ldas/history", async (ClaimsPrincipal principal, TrackingDbContext db,
    int page = 1, int pageSize = 20, CancellationToken ct = default) =>
{
    if (!TryUserId(principal, out var userId)) return Results.Unauthorized();
    if (!ValidPagination(page, pageSize))
        return Results.BadRequest(new { error = "invalid_pagination" });
    var query = db.Scores.AsNoTracking().Where(s => s.UserId == userId);
    var total = await query.CountAsync(ct);
    var items = await query.OrderByDescending(s => s.LocalDate)
        .ThenByDescending(s => s.CalculatedAtUtc)
        .Skip((page - 1) * pageSize).Take(pageSize)
        .Select(s => new { s.LocalDate, s.Version, s.Score, s.CoveragePercent,
            s.IsPartial, s.MissingDataJson, s.CalculatedAtUtc })
        .ToListAsync(ct);
    return Results.Ok(new { items, page, pageSize, totalItems = total });
});

app.Run();

static bool TryUserId(ClaimsPrincipal principal, out Guid userId) =>
    Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out userId);

// SQL OFFSET uses a 32-bit integer; reject excessively large page numbers before arithmetic overflow.
static bool ValidPagination(int page, int pageSize) =>
    page >= 1 && pageSize is >= 1 and <= 100 && (long)(page - 1) * pageSize <= int.MaxValue;

public partial class Program;
