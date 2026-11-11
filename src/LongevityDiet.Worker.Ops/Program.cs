using System.Security.Claims;
using System.Text;
using LongevityDiet.Worker.Ops;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

var connection = builder.Configuration.GetConnectionString("Worker")
    ?? throw new InvalidOperationException("Worker operations SQL owner connection required.");
if (!string.Equals(new SqlConnectionStringBuilder(connection).InitialCatalog,
        "LongevityWorkerDb", StringComparison.OrdinalIgnoreCase))
    throw new InvalidOperationException("Worker Ops may only connect to LongevityWorkerDb.");
var issuer = builder.Configuration["Jwt:Issuer"];
var audience = builder.Configuration["Jwt:Audience"];
var signingKey = builder.Configuration["Jwt:SigningKey"];
if (string.IsNullOrWhiteSpace(issuer) || string.IsNullOrWhiteSpace(audience) ||
    string.IsNullOrWhiteSpace(signingKey) || Encoding.UTF8.GetByteCount(signingKey) < 32)
    throw new InvalidOperationException("Worker operations JWT issuer/audience/key required.");
if (string.IsNullOrWhiteSpace(builder.Configuration["Redis:ConnectionString"]))
    throw new InvalidOperationException("Worker Ops Redis connection required.");

builder.Services.AddDbContext<WorkerOpsDbContext>(o =>
    o.UseSqlServer(connection, sql => sql.EnableRetryOnFailure()));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddHostedService<WorkerOwnedEventConsumer>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, ValidIssuer = issuer,
            ValidateAudience = true, ValidAudience = audience,
            ValidateLifetime = true, ValidateIssuerSigningKey = true,
            IssuerSigningKey =
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = ClaimTypes.Name,
            RoleClaimType = ClaimTypes.Role
        };
    });
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("worker-ops-admin", policy =>
        policy.RequireAuthenticatedUser().RequireRole("Admin"));
});
builder.Services.AddProblemDetails();

var app = builder.Build();
app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    await using var scope = app.Services.CreateAsyncScope();
    await scope.ServiceProvider.GetRequiredService<WorkerOpsDbContext>()
        .Database.MigrateAsync();
}

app.MapGet("/health", () =>
    Results.Ok(new { service = "worker-ops", status = "alive" }));
app.MapGet("/ready", async (WorkerOpsDbContext db, CancellationToken ct) =>
{
    try
    {
        _ = await db.ReceivedEvents.AsNoTracking().AnyAsync(ct);
        return Results.Ok(new { service = "worker-ops",
            database = "LongevityWorkerDb", status = "ready" });
    }
    catch (Exception)
    {
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }
});

var admin = app.MapGroup("/api/v1/admin")
    .RequireAuthorization("worker-ops-admin");
admin.MapWorkerJobs();
admin.MapGet("/events", async (WorkerOpsDbContext db,
    string? source, int page = 1, int pageSize = 25, CancellationToken ct = default) =>
{
    if (page is < 1 or > 100000 || pageSize is < 1 or > 100 ||
        (source is not null &&
         source is not ("planning" or "tracking" or "catalog" or "recommendation")))
        return Results.BadRequest(new { error = "invalid_pagination_or_source" });
    var rows = db.ReceivedEvents.AsNoTracking();
    if (source is not null) rows = rows.Where(x => x.Source == source);
    var total = await rows.CountAsync(ct);
    var data = await rows.OrderByDescending(x => x.ReceivedAtUtc)
        .ThenBy(x => x.EventId).Skip((page - 1) * pageSize).Take(pageSize)
        .Select(x => new
        {
            x.Source, x.EventId, x.EventType, x.RedisStreamId, x.ReceivedAtUtc
        }).ToArrayAsync(ct);
    return Results.Ok(new { items = data, totalItems = total, page, pageSize });
});

admin.MapGet("/dead-letter", async (WorkerOpsDbContext db,
    int page = 1, int pageSize = 25, bool? resolved = null,
    CancellationToken ct = default) =>
{
    if (page is < 1 or > 100000 || pageSize is < 1 or > 100)
        return Results.BadRequest(new { error = "invalid_pagination" });
    var rows = db.DeadLetters.AsNoTracking();
    if (resolved is not null) rows = rows.Where(x => x.IsResolved == resolved);
    var total = await rows.CountAsync(ct);
    var data = await rows.OrderByDescending(x => x.RejectedAtUtc)
        .ThenByDescending(x => x.Id).Skip((page - 1) * pageSize).Take(pageSize)
        .Select(x => new
        {
            x.Id, x.Source, x.RedisStreamId, x.EventType,
            x.ReasonCode, x.RejectedAtUtc, x.IsResolved, x.ResolvedAtUtc
        }).ToArrayAsync(ct);
    return Results.Ok(new { items = data, totalItems = total, page, pageSize });
});

app.Run();
public partial class Program;
