using LongevityDiet.Tracking;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

namespace LongevityDiet.Tracking.Api;

/// <summary>
/// Send only Tracking's transactional Outbox to its own Redis Stream.
/// At-least-once delivery; consumers must dedupe by immutable EventId.
/// </summary>
public sealed partial class TrackingOutboxPublisher(
    IServiceScopeFactory scopes,
    IConfiguration config,
    ILogger<TrackingOutboxPublisher> logger,
    TimeProvider clock) : BackgroundService
{
    [LoggerMessage(EventId = 8601, Level = LogLevel.Warning,
        Message = "Tracking Redis unavailable; retrying")]
    private static partial void RedisUnavailable(ILogger logger, Exception error);

    [LoggerMessage(EventId = 8602, Level = LogLevel.Warning,
        Message = "Tracking event publish retry eventId={EventId}")]
    private static partial void PublishFailed(ILogger logger, Guid eventId, Exception error);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var conn = config["Redis:ConnectionString"];
        if (string.IsNullOrWhiteSpace(conn))
            throw new InvalidOperationException("Tracking Redis connection must be configured.");
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var redis = await ConnectionMultiplexer.ConnectAsync(conn);
                var stream = redis.GetDatabase();
                while (!stoppingToken.IsCancellationRequested)
                {
                    await FlushAsync(stream, stoppingToken);
                    await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (RedisException error)
            {
                RedisUnavailable(logger, error);
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }
    }

    private async Task FlushAsync(IDatabase redis, CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TrackingDbContext>();
        var rows = await db.Outbox.Where(x => x.PublishedAtUtc == null &&
            x.PublishAttempts < 5).OrderBy(x => x.CreatedAtUtc)
            .Take(30).ToArrayAsync(ct);
        foreach (var row in rows)
        {
            try
            {
                await redis.StreamAddAsync("ldc:tracking-events", [
                    new NameValueEntry("eventId", row.EventId.ToString("D")),
                    new NameValueEntry("eventType", row.EventType),
                    new NameValueEntry("payload", row.PayloadJson),
                ]);
                row.PublishedAtUtc = clock.GetUtcNow().UtcDateTime;
            }
            catch (RedisException error)
            {
                row.PublishAttempts++;
                PublishFailed(logger, row.EventId, error);
            }
            await db.SaveChangesAsync(ct);
        }
    }
}
