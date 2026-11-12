using System.Net;
using System.Text.Json;
using LongevityDiet.Domain.Entities;
using LongevityDiet.Repositories;
using LongevityDiet.Services.Reminders;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using WebPush;

namespace LongevityDiet.API.Reminders;

/// <summary>
/// Optional true background Web Push. It consumes the existing worker events
/// from its OWN Redis Streams group, never takes events from the in-app inbox
/// consumer and never sends private health details to browser push providers.
/// </summary>
public sealed partial class WebPushReminderHostedService(
    IServiceScopeFactory scopes, IConfiguration config,
    ILogger<WebPushReminderHostedService> logger) : BackgroundService
{
    private const string Stream = "ldc:worker-events";
    private const string Group = "ldc-webpush-delivery-v1";
    private const string Consumer = "webpush-owner";
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [LoggerMessage(EventId = 5520, Level = LogLevel.Warning,
        Message = "Web Push worker unavailable ({Kind}); retry scheduled")]
    private static partial void LogOffline(ILogger logger, string kind);

    [LoggerMessage(EventId = 5521, Level = LogLevel.Warning,
        Message = "Web Push gateway rejected delivery ({Status})")]
    private static partial void LogFailed(ILogger logger, int status);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var settings = WebPushSubscriptionStore.Config(config);
        var redisString = config["Redis:ConnectionString"] ??
            throw new InvalidOperationException("Redis is required for Web Push.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var connection = await ConnectionMultiplexer.ConnectAsync(redisString);
                var redis = connection.GetDatabase();
                try
                {
                    await redis.StreamCreateConsumerGroupAsync(
                        Stream, Group, "0-0", createStream: true);
                }
                catch (RedisServerException ex) when (
                    ex.Message.Contains("BUSYGROUP", StringComparison.OrdinalIgnoreCase))
                {
                    // Stable group survives restart, allowing pending redelivery.
                }

                var sender = new WebPushClient();
                var vapid = new VapidDetails(
                    settings.Subject, settings.PublicKey, settings.PrivateKey);

                while (!stoppingToken.IsCancellationRequested)
                {
                    foreach (var offset in new[] { "0-0", ">" })
                    {
                        var entries = await redis.StreamReadGroupAsync(
                            Stream, Group, Consumer, offset, count: 20);
                        foreach (var entry in entries)
                        {
                            var ack = await HandleAsync(
                                redis, entry, sender, vapid, stoppingToken);
                            if (ack)
                                await redis.StreamAcknowledgeAsync(Stream, Group, entry.Id);
                        }
                    }
                    await Task.Delay(TimeSpan.FromSeconds(4), stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                LogOffline(logger, ex.GetType().Name);
                try { await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken); }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                { return; }
            }
        }
    }

    private async Task<bool> HandleAsync(IDatabase redis, StreamEntry entry,
        WebPushClient sender, VapidDetails vapid, CancellationToken ct)
    {
        var kind = entry.Values.FirstOrDefault(
            x => x.Name == "eventType").Value.ToString();
        if (!string.Equals(kind, "NotificationReady.v1", StringComparison.Ordinal))
            return true;

        NotificationReadyEvent? evt;
        try
        {
            var data = entry.Values.FirstOrDefault(
                x => x.Name == "payload").Value.ToString();
            if (data.Length > 4096) return await QuarantineAsync(
                redis, entry.Id, "oversized_event");
            evt = JsonSerializer.Deserialize<NotificationReadyEvent>(data, Json);
        }
        catch (JsonException)
        {
            return await QuarantineAsync(redis, entry.Id, "invalid_json");
        }

        if (evt is null || evt.UserId == Guid.Empty ||
            evt.EventId == Guid.Empty ||
            string.IsNullOrWhiteSpace(evt.DeduplicationKey) ||
            evt.DeduplicationKey.Length > 160)
            return await QuarantineAsync(redis, entry.Id, "invalid_envelope");

        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LongevityDietDbContext>();
        var user = await db.Users.AsNoTracking()
            .Where(x => x.Id == evt.UserId)
            .Select(x => new { x.Status }).SingleOrDefaultAsync(ct);
        var preference = await db.ReminderPreferences.AsNoTracking()
            .SingleOrDefaultAsync(x => x.UserId == evt.UserId, ct);

        if (user is not { Status: AccountStatus.Active } ||
            preference is not { OptedIn: true })
            return true;

        var enabledForCategory = evt.Category switch
        {
            ReminderCategory.MealLogging => preference.MealLoggingEnabled,
            ReminderCategory.Activity => preference.ActivityEnabled,
            ReminderCategory.Challenge => preference.ChallengeEnabled,
            ReminderCategory.WeeklySummary => preference.WeeklySummaryEnabled,
            _ => false
        };
        if (!enabledForCategory) return true;

        // The existing Identity Redis bridge persists the notification first.
        // If it is still processing, leave this WebPush group delivery pending
        // rather than sending a push for a notification that may be rejected.
        var stored = await db.Notifications.AsNoTracking()
            .Where(n => n.UserId == evt.UserId &&
                        n.DeduplicationKey == evt.DeduplicationKey)
            .Select(n => new { n.CreatedAtUtc }).SingleOrDefaultAsync(ct);
        if (stored is null)
        {
            // Avoid infinite pending replay if Identity rejected the event.
            if (EventAge(entry.Id) > TimeSpan.FromMinutes(15))
                return await QuarantineAsync(redis, entry.Id, "persist_timeout");
            return false;
        }

        var subscriptions = await WebPushSubscriptionStore.ReadAsync(
            redis, evt.UserId);
        if (subscriptions.Length == 0) return true;

        var notification = JsonSerializer.Serialize(new
        {
            id = evt.EventId.ToString("N"),
            title = "LongevityDiet có thông báo mới",
            body = "Mở ứng dụng để xem lời nhắc.",
            url = "/notifications"
        }, Json);

        foreach (var item in subscriptions)
        {
            // Never retroactively push reminders created before a device opted in.
            if (stored.CreatedAtUtc < item.SubscribedAtUtc) continue;
            var hash = WebPushSubscriptionStore.Hash(item.Endpoint);
            var receipt = "ldc:webpush:receipt:" + evt.EventId.ToString("N") +
                ":" + hash;
            if (await redis.KeyExistsAsync(receipt)) continue;
            try
            {
                await sender.SendNotificationAsync(
                    new PushSubscription(item.Endpoint, item.P256dh, item.Auth),
                    notification, vapid, cancellationToken: ct);
                await redis.StringSetAsync(receipt, "1", TimeSpan.FromDays(14));
            }
            catch (WebPushException error)
            {
                // Never print push endpoint (bearer-like capability URL).
                LogFailed(logger, (int)error.StatusCode);
                if (error.StatusCode is HttpStatusCode.Gone or HttpStatusCode.NotFound
                    or HttpStatusCode.BadRequest)
                {
                    await redis.HashDeleteAsync(
                        WebPushSubscriptionStore.Key(evt.UserId), hash);
                    continue;
                }
                var retryKey = "ldc:webpush:retry:" +
                    evt.EventId.ToString("N");
                var attempts = await redis.StringIncrementAsync(retryKey);
                await redis.KeyExpireAsync(retryKey, TimeSpan.FromDays(1));
                if (attempts >= 5)
                    return await QuarantineAsync(redis, entry.Id,
                        "push_provider_retry_exhausted");
                return false;
            }
        }

        return true;
    }

    private static TimeSpan EventAge(RedisValue streamId)
    {
        var raw = streamId.ToString().Split('-', 2)[0];
        if (!long.TryParse(raw, out var ms)) return TimeSpan.MaxValue;
        try { return DateTimeOffset.UtcNow -
                DateTimeOffset.FromUnixTimeMilliseconds(ms); }
        catch (ArgumentOutOfRangeException) { return TimeSpan.MaxValue; }
    }

    private static async Task<bool> QuarantineAsync(
        IDatabase redis, RedisValue entryId, string reason)
    {
        // Metadata-only DLQ, no user ID, endpoint or health data.
        await redis.StreamAddAsync("ldc:webpush:dead-letter",
        [
            new NameValueEntry("streamId", entryId),
            new NameValueEntry("reason", reason)
        ]);
        return true;
    }
}
