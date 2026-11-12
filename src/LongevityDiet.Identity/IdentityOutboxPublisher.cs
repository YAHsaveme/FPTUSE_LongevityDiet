using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

namespace LongevityDiet.Identity;

/// <summary>
/// Identity domain owns both the SQL Outbox and its Redis publisher. Every
/// successful XADD is followed by an owned-database delivery acknowledgement.
/// Consumers must de-duplicate eventId because publish is at least once.
/// </summary>
public sealed partial class IdentityOutboxPublisher(
    IServiceScopeFactory scopes,
    IConfiguration configuration,
    ILogger<IdentityOutboxPublisher> logger,
    TimeProvider clock) : BackgroundService
{
    private const string ReminderStream = "ldc:identity-events";
    private const string ProfileStream = "ldc:identity-profile-events";

    [LoggerMessage(EventId = 8401, Level = LogLevel.Warning,
        Message = "Identity publisher Redis connection failed; retrying")]
    private static partial void RedisDisconnected(ILogger logger, Exception error);

    [LoggerMessage(EventId = 8402, Level = LogLevel.Warning,
        Message = "Identity event publish failed: {EventId}")]
    private static partial void PublishFailed(ILogger logger, Guid eventId, Exception error);

    [LoggerMessage(EventId = 8403, Level = LogLevel.Error,
        Message = "Identity Outbox contains unsupported event type for event {EventId}")]
    private static partial void UnsupportedEvent(ILogger logger, Guid eventId);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var redisUrl = configuration["Redis:ConnectionString"]
            ?? throw new InvalidOperationException("Identity Redis connection is required.");
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var connection = await ConnectionMultiplexer.ConnectAsync(redisUrl);
                var redis = connection.GetDatabase();
                while (!stoppingToken.IsCancellationRequested)
                {
                    await PublishPendingAsync(redis, stoppingToken);
                    await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (RedisException error)
            {
                RedisDisconnected(logger, error);
                try { await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken); }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                { break; }
            }
        }
    }

    private async Task PublishPendingAsync(IDatabase redis, CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var events = await db.IdentityOutbox
            .Where(e => e.PublishedAtUtc == null && e.PublishAttempts < 5)
            .OrderBy(e => e.CreatedAtUtc).ThenBy(e => e.Id).Take(30).ToArrayAsync(ct);

        foreach (var evt in events)
        {
            var stream = evt.EventType switch
            {
                "ReminderPreferenceUpdated.v1" => ReminderStream,
                "UserProfileUpdated.v1" => ProfileStream,
                _ => null
            };
            if (stream is null)
            {
                evt.PublishAttempts++;
                UnsupportedEvent(logger, evt.Id);
                await db.SaveChangesAsync(ct);
                continue;
            }

            try
            {
                await redis.StreamAddAsync(stream, [
                    new NameValueEntry("eventId", evt.Id.ToString("D")),
                    new NameValueEntry("eventType", evt.EventType),
                    new NameValueEntry("payload", evt.PayloadJson),
                ]);
                evt.PublishedAtUtc = clock.GetUtcNow().UtcDateTime;
            }
            catch (RedisException error)
            {
                evt.PublishAttempts++;
                PublishFailed(logger, evt.Id, error);
            }

            await db.SaveChangesAsync(ct);
        }
    }
}
