using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

namespace LongevityDiet.Planning;

/// <summary>
/// Planning publishes only its own SQL Outbox into its own Redis Stream.
/// Consumers must deduplicate by eventId: XADD + SQL ack is at-least-once.
/// </summary>
public sealed partial class PlanningOutboxPublisher(
    IServiceScopeFactory scopes,
    IConfiguration config,
    ILogger<PlanningOutboxPublisher> logger,
    TimeProvider clock) : BackgroundService
{
    private const string PlanningStream = "ldc:planning-events";

    [LoggerMessage(EventId = 8501, Level = LogLevel.Warning,
        Message = "Planning Redis publishing disconnected; retrying")]
    private static partial void WarnRedis(ILogger logger, Exception error);

    [LoggerMessage(EventId = 8502, Level = LogLevel.Warning,
        Message = "Planning event publish failed for {EventId}")]
    private static partial void WarnPublish(ILogger logger, Guid eventId, Exception error);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var address = config["Redis:ConnectionString"];
        if (string.IsNullOrWhiteSpace(address))
            throw new InvalidOperationException("Planning Redis publisher requires a connection string.");
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var connection = await ConnectionMultiplexer.ConnectAsync(address);
                var redis = connection.GetDatabase();
                while (!stoppingToken.IsCancellationRequested)
                {
                    await PublishAsync(redis, stoppingToken);
                    await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (RedisException error)
            {
                WarnRedis(logger, error);
                try { await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken); }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                { break; }
            }
        }
    }

    private async Task PublishAsync(IDatabase redis, CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PlanningDbContext>();
        var messages = await db.Outbox
            .Where(x => x.PublishedAtUtc == null && x.PublishAttempts < 5)
            .OrderBy(x => x.CreatedAtUtc).ThenBy(x => x.Id)
            .Take(30).ToArrayAsync(ct);
        foreach (var message in messages)
        {
            try
            {
                await redis.StreamAddAsync(PlanningStream, [
                    new NameValueEntry("eventId", message.Id.ToString("D")),
                    new NameValueEntry("eventType", message.EventType),
                    new NameValueEntry("payload", message.PayloadJson),
                ]);
                message.PublishedAtUtc = clock.GetUtcNow().UtcDateTime;
            }
            catch (RedisException error)
            {
                message.PublishAttempts++;
                WarnPublish(logger, message.Id, error);
            }
            await db.SaveChangesAsync(ct);
        }
    }
}
