using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

namespace LongevityDiet.Recommendation.Grpc.Ownership;

/// <summary>
/// No Worker queries Recommendation SQL. Changes are committed in the same
/// owner transaction as Outbox and relayed at-least-once via Redis Streams.
/// Consumer owns idempotent deduplication by immutable eventId.
/// </summary>
public sealed partial class RecommendationOutboxPublisher(
    IServiceScopeFactory scopes,
    IConfiguration config,
    ILogger<RecommendationOutboxPublisher> logger,
    TimeProvider clock) : BackgroundService
{
    [LoggerMessage(EventId = 8701, Level = LogLevel.Warning,
        Message = "Recommendation Redis unavailable; retrying")]
    private static partial void RedisUnavailable(ILogger logger, Exception error);

    [LoggerMessage(EventId = 8702, Level = LogLevel.Warning,
        Message = "Recommendation event retry eventId={EventId}")]
    private static partial void PublishFailed(ILogger logger, Guid eventId, Exception error);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var address = config["Redis:ConnectionString"];
        if (string.IsNullOrWhiteSpace(address))
            throw new InvalidOperationException("Recommendation Redis connection required.");
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var connection = await ConnectionMultiplexer.ConnectAsync(address);
                var redis = connection.GetDatabase();
                while (!stoppingToken.IsCancellationRequested)
                {
                    await FlushAsync(redis, stoppingToken);
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
                try { await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken); }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                { return; }
            }
        }
    }

    private async Task FlushAsync(IDatabase redis, CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecommendationDbContext>();
        var rows = await db.Outbox
            .Where(x => x.PublishedAtUtc == null && x.PublishAttempts < 5)
            .OrderBy(x => x.CreatedAtUtc).ThenBy(x => x.EventId)
            .Take(30).ToArrayAsync(ct);
        foreach (var row in rows)
        {
            try
            {
                await redis.StreamAddAsync("ldc:recommendation-events", [
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
