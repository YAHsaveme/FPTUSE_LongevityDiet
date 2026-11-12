using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using StackExchange.Redis;

namespace LongevityDiet.Worker.Ops;

/// <summary>
/// Opt-in event transport mirror: real Planning, Tracking, Catalog and
/// Recommendation Redis domain events -> durable RabbitMQ topic exchange ->
/// Worker-owned SQL audit receipts. This never replaces the existing Redis
/// domain processing pipeline and never forwards personal/medical payloads.
/// </summary>
internal static class RabbitMqDomainAudit
{
    public const string Exchange = "ldc.domain-events.audit.v1";
    public const string Queue = "ldc.worker-ops.audit.v1";
    public const string DeadLetterQueue = "ldc.worker-ops.audit.dlq.v1";
    public static readonly (string Source, string Stream)[] Sources =
    [
        ("planning", "ldc:planning-events"),
        ("tracking", "ldc:tracking-events"),
        ("catalog", "ldc:catalog-events"),
        ("recommendation", "ldc:recommendation-events")
    ];

    public sealed record Envelope(string Source, Guid EventId, string EventType,
        string RedisStreamId);

    private static readonly Regex EventName = new(
        "^[A-Z][A-Za-z0-9]{2,80}\\.v[1-9][0-9]?$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant,
        TimeSpan.FromMilliseconds(200));

    public static bool IsValid(Envelope? value) =>
        value is not null
        && Sources.Any(x => x.Source == value.Source)
        && value.EventId != Guid.Empty
        && !string.IsNullOrWhiteSpace(value.EventType)
        && value.EventType.Length <= 100
        && EventName.IsMatch(value.EventType)
        && !string.IsNullOrWhiteSpace(value.RedisStreamId)
        && value.RedisStreamId.Length <= 60;

    public static ConnectionFactory Factory(IConfiguration config, IHostEnvironment env)
    {
        var host = config["RabbitMq:HostName"];
        var user = config["RabbitMq:UserName"];
        var password = config["RabbitMq:Password"];
        var useTls = config.GetValue<bool>("RabbitMq:UseTls");
        if (string.IsNullOrWhiteSpace(host) ||
            string.IsNullOrWhiteSpace(user) ||
            string.IsNullOrWhiteSpace(password))
            throw new InvalidOperationException(
                "RabbitMq enabled requires HostName, UserName and Password secrets.");
        if (!env.IsDevelopment() && !useTls)
            throw new InvalidOperationException(
                "RabbitMq must use TLS outside an isolated Development environment.");

        return new ConnectionFactory
        {
            HostName = host,
            Port = config.GetValue("RabbitMq:Port", useTls ? 5671 : 5672),
            UserName = user,
            Password = password,
            AutomaticRecoveryEnabled = true,
            ConsumerDispatchConcurrency = 1,
            Ssl = { Enabled = useTls, ServerName = host }
        };
    }

    public static async Task EnsureTopologyAsync(IChannel channel, CancellationToken ct)
    {
        await channel.ExchangeDeclareAsync(Exchange, ExchangeType.Topic,
            durable: true, autoDelete: false, arguments: null, cancellationToken: ct);
        await channel.QueueDeclareAsync(Queue, durable: true,
            exclusive: false, autoDelete: false, arguments: null, cancellationToken: ct);
        await channel.QueueBindAsync(Queue, Exchange,
            "event.*", arguments: null, cancellationToken: ct);
        await channel.QueueDeclareAsync(DeadLetterQueue, durable: true,
            exclusive: false, autoDelete: false, arguments: null, cancellationToken: ct);
    }
}

/// <summary>
/// Dedicated Redis consumer group is independent of the existing worker group.
/// Redis ACK happens only after confirmed, persistent RabbitMQ publish.
/// Any network failure leaves the event pending for replay. SQL-backed
/// Rabbit consumer deduplicates event IDs after an at-least-once replay.
/// </summary>
public sealed partial class RabbitMqRedisEventMirror(
    IConfiguration config,
    IHostEnvironment environment,
    ILogger<RabbitMqRedisEventMirror> logger) : BackgroundService
{
    [LoggerMessage(EventId = 8890, Level = LogLevel.Warning,
        Message = "RabbitMQ audit mirror unavailable ({Kind}); retrying")]
    private static partial void LogMirrorUnavailable(ILogger logger, string kind);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var factory = RabbitMqDomainAudit.Factory(config, environment);
        var redisAddress = config["Redis:ConnectionString"] ??
            throw new InvalidOperationException("RabbitMQ mirror requires Redis connection.");
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var connection = await factory.CreateConnectionAsync(stoppingToken);
                await using var channel = await connection.CreateChannelAsync(
                    new CreateChannelOptions(
                        publisherConfirmationsEnabled: true,
                        publisherConfirmationTrackingEnabled: true), stoppingToken);
                await RabbitMqDomainAudit.EnsureTopologyAsync(channel, stoppingToken);
                using var redisMux = await ConnectionMultiplexer.ConnectAsync(redisAddress);
                var redis = redisMux.GetDatabase();
                foreach (var (source, stream) in RabbitMqDomainAudit.Sources)
                {
                    try
                    {
                        await redis.StreamCreateConsumerGroupAsync(
                            stream, "ldc-rabbit-audit-" + source, "0-0", createStream: true);
                    }
                    catch (RedisServerException error) when (
                        error.Message.Contains("BUSYGROUP", StringComparison.OrdinalIgnoreCase))
                    {
                        // Existing group survives restarts.
                    }
                }

                while (!stoppingToken.IsCancellationRequested)
                {
                    foreach (var (source, stream) in RabbitMqDomainAudit.Sources)
                    {
                        var group = "ldc-rabbit-audit-" + source;
                        var pending = await redis.StreamReadGroupAsync(
                            stream, group, "rabbit-audit", "0-0", count: 20);
                        foreach (var entry in pending)
                            await MirrorAsync(redis, channel, source, stream, group, entry, stoppingToken);
                        var claimed = await redis.StreamAutoClaimAsync(
                            stream, group, "rabbit-audit", 60_000, "0-0", 20);
                        foreach (var entry in claimed.ClaimedEntries)
                            await MirrorAsync(redis, channel, source, stream, group, entry, stoppingToken);
                        var fresh = await redis.StreamReadGroupAsync(
                            stream, group, "rabbit-audit", ">", count: 20);
                        foreach (var entry in fresh)
                            await MirrorAsync(redis, channel, source, stream, group, entry, stoppingToken);
                    }
                    await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
            catch (Exception ex)
            {
                LogMirrorUnavailable(logger, ex.GetType().Name);
                try { await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken); }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
            }
        }
    }

    private static async Task MirrorAsync(IDatabase redis, IChannel channel,
        string source, string stream, string group, StreamEntry entry, CancellationToken stoppingToken)
    {
        var fields = entry.Values.ToDictionary(
            x => x.Name.ToString(), x => x.Value.ToString(), StringComparer.Ordinal);
        fields.TryGetValue("eventId", out var rawId);
        fields.TryGetValue("eventType", out var eventType);
        var evt = new RabbitMqDomainAudit.Envelope(source,
            Guid.TryParse(rawId, out var id) ? id : Guid.Empty,
            eventType ?? "", entry.Id.ToString());
        if (!RabbitMqDomainAudit.IsValid(evt))
        {
            // Do not replicate payloads to dead-letter; only record a safe reason.
            await redis.StreamAddAsync("ldc:rabbit-audit-rejected",
            [
                new NameValueEntry("source", source),
                new NameValueEntry("streamId", entry.Id),
                new NameValueEntry("reason", "InvalidEventEnvelope")
            ]);
            await redis.StreamAcknowledgeAsync(stream, group, entry.Id);
            return;
        }

        var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(evt));
        var properties = new BasicProperties
        {
            ContentType = "application/json",
            DeliveryMode = DeliveryModes.Persistent,
            MessageId = evt.EventId.ToString("D"),
            Type = evt.EventType
        };
        await channel.BasicPublishAsync(RabbitMqDomainAudit.Exchange,
            "event." + source, mandatory: true, basicProperties: properties,
            body: body, cancellationToken: stoppingToken);
        // With v7 publisher confirmations enabled, the await above completes
        // only after a broker confirmation, or throws on basic.nack/return.
        await redis.StreamAcknowledgeAsync(stream, group, entry.Id);
    }
}

/// <summary>
/// RabbitMQ domain audit consumer. Persists only event ID/type/source/stream
/// pointers in LongevityWorkerDb and ACKs after SQL commit. Replayed messages
/// are ignored by the same unique WorkerReceivedEvents primary key.
/// A malformed event goes to the durable broker DLQ without copying PII.
/// </summary>
public sealed partial class RabbitMqOwnedAuditConsumer(
    IServiceScopeFactory scopes,
    IConfiguration config,
    IHostEnvironment environment,
    TimeProvider clock,
    ILogger<RabbitMqOwnedAuditConsumer> logger) : BackgroundService
{
    [LoggerMessage(EventId = 8891, Level = LogLevel.Warning,
        Message = "RabbitMQ audit SQL receipt failed ({Kind}); requeue")]
    private static partial void LogReceiptFailure(ILogger logger, string kind);

    [LoggerMessage(EventId = 8892, Level = LogLevel.Warning,
        Message = "RabbitMQ audit consumer disconnected ({Kind}); retrying")]
    private static partial void LogConsumerDisconnected(ILogger logger, string kind);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var factory = RabbitMqDomainAudit.Factory(config, environment);
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var connection = await factory.CreateConnectionAsync(stoppingToken);
                await using var channel = await connection.CreateChannelAsync(
                    new CreateChannelOptions(
                        publisherConfirmationsEnabled: true,
                        publisherConfirmationTrackingEnabled: true), stoppingToken);
                await RabbitMqDomainAudit.EnsureTopologyAsync(channel, stoppingToken);
                await channel.BasicQosAsync(prefetchSize: 0, prefetchCount: 10,
                    global: false, cancellationToken: stoppingToken);
                var consumer = new AsyncEventingBasicConsumer(channel);
                consumer.ReceivedAsync += async (_, delivery) =>
                {
                    // RabbitMQ.Client 7: copy only bounded metadata during callback.
                    // Oversized untrusted messages go to safe DLQ without raw PII.
                    var bytes = delivery.Body.Length <= 4096
                        ? delivery.Body.ToArray() : Array.Empty<byte>();
                    try
                    {
                        RabbitMqDomainAudit.Envelope? evt = null;
                        try { evt = JsonSerializer.Deserialize<RabbitMqDomainAudit.Envelope>(bytes); }
                        catch (JsonException) { /* reject below */ }
                        if (!RabbitMqDomainAudit.IsValid(evt) ||
                            !string.Equals(delivery.BasicProperties.MessageId,
                                evt!.EventId.ToString("D"), StringComparison.OrdinalIgnoreCase))
                        {
                            var rejected = new BasicProperties
                            {
                                ContentType = "application/json",
                                DeliveryMode = DeliveryModes.Persistent
                            };
                            var reason = Encoding.UTF8.GetBytes(
                                "{\"reason\":\"InvalidRabbitAuditEnvelope\"}");
                            await channel.BasicPublishAsync("",
                                RabbitMqDomainAudit.DeadLetterQueue,
                                mandatory: true, basicProperties: rejected,
                                body: reason, cancellationToken: stoppingToken);
                            await channel.BasicAckAsync(delivery.DeliveryTag,
                                multiple: false, cancellationToken: stoppingToken);
                            return;
                        }
                        await using var scope = scopes.CreateAsyncScope();
                        var db = scope.ServiceProvider.GetRequiredService<WorkerOpsDbContext>();
                        var source = "rabbit-" + evt!.Source;
                        if (!await db.ReceivedEvents.AnyAsync(x =>
                                x.Source == source && x.EventId == evt.EventId, stoppingToken))
                        {
                            db.ReceivedEvents.Add(new WorkerReceivedEvent
                            {
                                Source = source,
                                EventId = evt.EventId,
                                EventType = evt.EventType,
                                RedisStreamId = evt.RedisStreamId,
                                ReceivedAtUtc = clock.GetUtcNow().UtcDateTime
                            });
                            try { await db.SaveChangesAsync(stoppingToken); }
                            catch (DbUpdateException)
                            {
                                db.ChangeTracker.Clear();
                                if (!await db.ReceivedEvents.AsNoTracking().AnyAsync(x =>
                                    x.Source == source && x.EventId == evt.EventId, stoppingToken))
                                    throw;
                            }
                        }
                        await channel.BasicAckAsync(delivery.DeliveryTag,
                            multiple: false, cancellationToken: stoppingToken);
                    }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
                    catch (Exception error)
                    {
                        LogReceiptFailure(logger, error.GetType().Name);
                        await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
                        await channel.BasicNackAsync(delivery.DeliveryTag,
                            multiple: false, requeue: true, cancellationToken: stoppingToken);
                    }
                };
                await channel.BasicConsumeAsync(RabbitMqDomainAudit.Queue,
                    autoAck: false, consumer: consumer, cancellationToken: stoppingToken);
                // Keep the channel alive. The callback is sequential with
                // ConsumerDispatchConcurrency=1 and never shares a publish channel.
                await Task.Delay(Timeout.InfiniteTimeSpan, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
            catch (Exception ex)
            {
                LogConsumerDisconnected(logger, ex.GetType().Name);
                try { await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken); }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
            }
        }
    }
}
