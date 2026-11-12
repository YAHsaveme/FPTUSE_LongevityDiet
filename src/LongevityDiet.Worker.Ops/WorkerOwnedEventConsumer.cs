using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

namespace LongevityDiet.Worker.Ops;

/// <summary>
/// Opt-in, read-only integration-event audit consumer. A receipt means the
/// event envelope was validated and durably observed, NOT that any other
/// domain's business transaction or weekly report was executed.
/// Redis consumer group + WorkerDb composite PK guarantee idempotent replay.
/// </summary>
public sealed partial class WorkerOwnedEventConsumer(
    IServiceScopeFactory scopes,
    IConfiguration configuration,
    TimeProvider clock,
    ILogger<WorkerOwnedEventConsumer> logger) : BackgroundService
{
    private sealed record Origin(string Source, string Stream)
    {
        public string Group => "ldc-worker-ops-" + Source;
    }

    private static readonly Origin[] Origins =
    [
        new("planning", "ldc:planning-events"),
        new("tracking", "ldc:tracking-events"),
        new("recommendation", "ldc:recommendation-events"),
        new("catalog", "ldc:catalog-events"),
    ];
    private const string Consumer = "worker-ops-audit";
    private static readonly Regex VersionedEventName = new(
        "^[A-Z][A-Za-z0-9]{2,80}\\.v[1-9][0-9]?$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant, TimeSpan.FromMilliseconds(200));

    [LoggerMessage(EventId = 8801, Level = LogLevel.Warning,
        Message = "Worker ops event consumer disconnected; will retry")]
    private static partial void LogDisconnected(ILogger logger, Exception exception);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var address = configuration["Redis:ConnectionString"] ??
            throw new InvalidOperationException("Worker Ops requires Redis.");
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var mux = await ConnectionMultiplexer.ConnectAsync(address);
                var redis = mux.GetDatabase();
                foreach (var origin in Origins)
                    await EnsureGroupAsync(redis, origin);
                while (!stoppingToken.IsCancellationRequested)
                {
                    foreach (var origin in Origins)
                    {
                        await DrainAsync(redis, origin, stoppingToken);
                    }
                    await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception error) when (error is RedisException or DbUpdateException
                    or InvalidOperationException or System.Data.Common.DbException)
            {
                LogDisconnected(logger, error);
                try { await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken); }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                { return; }
            }
        }
    }

    private static async Task EnsureGroupAsync(IDatabase redis, Origin origin)
    {
        try
        {
            await redis.StreamCreateConsumerGroupAsync(
                origin.Stream, origin.Group, "0-0", createStream: true);
        }
        catch (RedisServerException error) when (
            error.Message.Contains("BUSYGROUP", StringComparison.OrdinalIgnoreCase))
        {
            // Group exists after process restart.
        }
    }

    private async Task DrainAsync(IDatabase redis, Origin origin, CancellationToken ct)
    {
        // Recover the current consumer's pending entries immediately, then
        // claim orphaned messages from crashed instances after their idle timeout.
        var pending = await redis.StreamReadGroupAsync(
            origin.Stream, origin.Group, Consumer, "0-0", count: 20);
        foreach (var entry in pending)
            await ProcessAsync(redis, origin, entry, ct);

        var claimed = await redis.StreamAutoClaimAsync(
            origin.Stream, origin.Group, Consumer, 60_000, "0-0", 20);
        foreach (var entry in claimed.ClaimedEntries)
            await ProcessAsync(redis, origin, entry, ct);

        var fresh = await redis.StreamReadGroupAsync(
            origin.Stream, origin.Group, Consumer, ">", count: 20);
        foreach (var entry in fresh)
            await ProcessAsync(redis, origin, entry, ct);
    }

    private async Task ProcessAsync(IDatabase redis, Origin origin,
        StreamEntry entry, CancellationToken ct)
    {
        var fields = entry.Values.ToDictionary(
            item => item.Name.ToString(), item => item.Value.ToString(),
            StringComparer.Ordinal);
        fields.TryGetValue("eventId", out var idText);
        fields.TryGetValue("eventType", out var eventType);
        fields.TryGetValue("payload", out var payload);
        var streamId = entry.Id.ToString();
        var eventId = Guid.TryParse(idText, out var parsed) ? parsed : Guid.Empty;
        var reason = ValidateEnvelope(eventId, eventType, payload);

        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<WorkerOpsDbContext>();
        var now = clock.GetUtcNow().UtcDateTime;
        if (reason is null)
        {
            if (!await db.ReceivedEvents.AnyAsync(
                x => x.Source == origin.Source && x.EventId == eventId, ct))
            {
                db.ReceivedEvents.Add(new WorkerReceivedEvent
                {
                    Source = origin.Source, EventId = eventId,
                    EventType = eventType!,
                    RedisStreamId = streamId,
                    ReceivedAtUtc = now
                });
            }
        }
        else if (!await db.DeadLetters.AnyAsync(
            x => x.Source == origin.Source && x.RedisStreamId == streamId, ct))
        {
            db.DeadLetters.Add(new WorkerRejectedEvent
            {
                Source = origin.Source, RedisStreamId = streamId,
                EventType = !string.IsNullOrWhiteSpace(eventType) && eventType.Length <= 100
                    ? eventType : "unknown",
                ReasonCode = reason, RejectedAtUtc = now,
            });
        }
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException)
        {
            // Another instance might have persisted a duplicate receipt.
            // Only ACK when the existing SQL receipt is independently verified.
            db.ChangeTracker.Clear();
            var saved = reason is null
                ? await db.ReceivedEvents.AsNoTracking().AnyAsync(
                    x => x.Source == origin.Source && x.EventId == eventId, ct)
                : await db.DeadLetters.AsNoTracking().AnyAsync(
                    x => x.Source == origin.Source && x.RedisStreamId == streamId, ct);
            if (!saved) throw;
        }

        if (reason is not null)
        {
            // No raw payload/PII is copied into the dead-letter stream.
            await redis.StreamAddAsync("ldc:worker-ops-dead-letter",
            [
                new NameValueEntry("source", origin.Source),
                new NameValueEntry("streamId", streamId),
                new NameValueEntry("eventType", !string.IsNullOrWhiteSpace(eventType)
                    ? eventType[..Math.Min(100, eventType.Length)] : "unknown"),
                new NameValueEntry("reason", reason)
            ]);
        }
        // Never ACK before the Worker-owned SQL transaction commits.
        await redis.StreamAcknowledgeAsync(origin.Stream, origin.Group, entry.Id);
    }

    private static string? ValidateEnvelope(Guid eventId, string? type, string? payload)
    {
        if (eventId == Guid.Empty) return "MissingEventId";
        if (string.IsNullOrWhiteSpace(type) || type.Length > 100 ||
            !VersionedEventName.IsMatch(type))
            return "InvalidEventType";
        if (string.IsNullOrWhiteSpace(payload) || payload.Length > 4096)
            return "InvalidPayloadLength";
        try
        {
            using var document = JsonDocument.Parse(payload);
            if (document.RootElement.ValueKind != JsonValueKind.Object ||
                !document.RootElement.TryGetProperty("eventId", out var id) ||
                id.ValueKind != JsonValueKind.String ||
                !Guid.TryParse(id.GetString(), out var payloadId) ||
                payloadId != eventId)
                return "EventIdMismatch";
        }
        catch (JsonException)
        {
            return "MalformedPayload";
        }
        return null;
    }
}
