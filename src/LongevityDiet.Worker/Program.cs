using System.Globalization;
using LongevityDiet.Repositories;
using LongevityDiet.Repositories.Repositories;
using LongevityDiet.Services.Tracking;
using LongevityDiet.Worker;
using LongevityDiet.Worker.Reminders;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Serilog;
using StackExchange.Redis;

Log.Logger = new LoggerConfiguration().WriteTo.Console(formatProvider: CultureInfo.InvariantCulture).CreateLogger();

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddSerilog();

// Opt-in target mode runs the real reminder/event worker solely on its own
// LongevityWorkerDb. The proven legacy weekly-report worker remains unchanged
// unless this mode is explicitly enabled in a separate Compose service.
var ownedOnly = builder.Configuration.GetValue<bool>("Worker:OwnedOnly");
var sqlConnection = builder.Configuration.GetConnectionString("Default");
if (!ownedOnly && string.IsNullOrWhiteSpace(sqlConnection))
    throw new InvalidOperationException("ConnectionStrings:Default is required by the legacy Worker.");
var workerConnection = builder.Configuration.GetConnectionString("Worker");
if (string.IsNullOrWhiteSpace(workerConnection))
{
    if (ownedOnly)
        throw new InvalidOperationException("Target Worker must have explicit owned SQL connection.");
    var connection = new SqlConnectionStringBuilder(sqlConnection!)
    {
        InitialCatalog = "LongevityWorkerDb",
    };
    workerConnection = connection.ConnectionString;
}
if (!string.Equals(new SqlConnectionStringBuilder(workerConnection).InitialCatalog,
    "LongevityWorkerDb", StringComparison.OrdinalIgnoreCase))
    throw new InvalidOperationException("Worker may connect only to LongevityWorkerDb.");

var redisConnectionString = builder.Configuration["Redis:ConnectionString"];

builder.Services.AddSingleton(TimeProvider.System);

builder.Services.AddDbContext<ReminderWorkerDbContext>(options =>
    options.UseSqlServer(workerConnection)); // manual business transactions; host retries transient failures
builder.Services.AddScoped<ReminderWorkerEngine>();
builder.Services.AddHostedService<ReminderWorkerHostedService>();

if (!ownedOnly)
{
    // Transitional Current Runtime only. Target mode never registers the
    // legacy main DbContext or its cross-domain weekly report repositories.
    builder.Services.AddDbContext<LongevityDietDbContext>(options =>
        options.UseSqlServer(sqlConnection!, sql => sql.EnableRetryOnFailure()));
    builder.Services.AddScoped<IWeeklyReportWorkerRepository, WeeklyReportWorkerRepository>();
    builder.Services.AddScoped<IChallengeProgressRepository, ChallengeProgressRepository>();
    builder.Services.AddScoped<ITrackingUserScheduleProvider, TrackingUserScheduleProvider>();
    builder.Services.AddScoped<IUserRepository, UserRepository>();
    builder.Services.AddScoped<WeeklyReportService>();
    builder.Services.AddScoped<WorkerReliabilityService>();

    if (!string.IsNullOrWhiteSpace(redisConnectionString))
    {
        builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
            ConnectionMultiplexer.Connect(redisConnectionString));
        builder.Services.AddHostedService<RedisWeeklyReportStreamWorker>();
    }

    builder.Services.AddHostedService<WeeklyReportWorker>();
}
else if (string.IsNullOrWhiteSpace(redisConnectionString))
{
    throw new InvalidOperationException("Target Worker requires Redis Streams.");
}

using var host = builder.Build();
if (host.Services.GetRequiredService<IHostEnvironment>().IsDevelopment())
{
    await using var scope = host.Services.CreateAsyncScope();
    await scope.ServiceProvider.GetRequiredService<ReminderWorkerDbContext>()
        .Database.MigrateAsync();
}

await host.RunAsync();
