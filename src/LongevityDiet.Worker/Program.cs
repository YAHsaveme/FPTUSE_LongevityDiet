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

var sqlConnection = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("ConnectionStrings:Default is required for the Worker.");
var workerConnection = builder.Configuration.GetConnectionString("Worker");
if (string.IsNullOrWhiteSpace(workerConnection))
{
    var connection = new SqlConnectionStringBuilder(sqlConnection)
    {
        InitialCatalog = "LongevityWorkerDb",
    };
    workerConnection = connection.ConnectionString;
}

var redisConnectionString = builder.Configuration["Redis:ConnectionString"];

builder.Services.AddSingleton(TimeProvider.System);

builder.Services.AddDbContext<ReminderWorkerDbContext>(options =>
    options.UseSqlServer(workerConnection)); // manual business transactions; host retries transient failures
builder.Services.AddScoped<ReminderWorkerEngine>();
builder.Services.AddHostedService<ReminderWorkerHostedService>();

builder.Services.AddDbContext<LongevityDietDbContext>(options =>
    options.UseSqlServer(sqlConnection, sql => sql.EnableRetryOnFailure()));
builder.Services.AddScoped<IWeeklyReportWorkerRepository, WeeklyReportWorkerRepository>();
builder.Services.AddScoped<IChallengeProgressRepository, ChallengeProgressRepository>();
builder.Services.AddScoped<ITrackingUserScheduleProvider, TrackingUserScheduleProvider>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<WeeklyReportService>();
builder.Services.AddScoped<WorkerReliabilityService>();

if (!string.IsNullOrWhiteSpace(redisConnectionString))
{
    builder.Services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisConnectionString));
    builder.Services.AddHostedService<RedisWeeklyReportStreamWorker>();
}

builder.Services.AddHostedService<WeeklyReportWorker>();

using var host = builder.Build();
if (host.Services.GetRequiredService<IHostEnvironment>().IsDevelopment())
{
    await using var scope = host.Services.CreateAsyncScope();
    await scope.ServiceProvider.GetRequiredService<ReminderWorkerDbContext>()
        .Database.MigrateAsync();
}

await host.RunAsync();
