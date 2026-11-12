using System.Net;
using System.Net.Mail;
using System.Text;
using LongevityDiet.Domain.Entities;
using LongevityDiet.Repositories;
using Microsoft.EntityFrameworkCore;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace LongevityDiet.API.Reminders;

/// <summary>
/// Dedicated opt-in email transport. RabbitMQ carries only notification GUIDs,
/// never email addresses or private health data. The Identity DB remains the
/// sole source of recipient address, consent and durable delivery state.
/// </summary>
public sealed partial class RabbitEmailNotificationService(
    IServiceScopeFactory scopes,
    IConfiguration configuration,
    IHostEnvironment environment,
    ILogger<RabbitEmailNotificationService> logger,
    TimeProvider clock) : BackgroundService
{
    private const string Exchange = "ldc.notifications.email.v1";
    private const string Queue = "ldc.identity.email-delivery.v1";
    private const string DeadLetter = "ldc.identity.email-delivery.dlq.v1";
    private const string RoutingKey = "email.ready";
    private const int MaxAttempts = 5;

    [LoggerMessage(EventId = 5310, Level = LogLevel.Warning,
        Message = "Email delivery worker error ({Kind}); RabbitMQ will retry")]
    private static partial void LogConsumerError(ILogger logger, string kind);

    [LoggerMessage(EventId = 5311, Level = LogLevel.Warning,
        Message = "Email queue disconnected ({Kind}); reconnect scheduled")]
    private static partial void LogQueueDisconnected(ILogger logger, string kind);

    [LoggerMessage(EventId = 5312, Level = LogLevel.Information,
        Message = "Email notification accepted by SMTP for opaque ID {NotificationId}")]
    private static partial void LogSent(ILogger logger, Guid notificationId);

    [LoggerMessage(EventId = 5313, Level = LogLevel.Warning,
        Message = "SMTP delivery error ({Kind})")]
    private static partial void LogSmtpError(ILogger logger, string kind);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // STARTUP fail-closed: do not run when SMTP/TLS, sender or recipient
        // restrictions are incomplete. The main app remains usable when off.
        var options = EmailDeliveryConfiguration.Read(configuration, environment);
        var factory = new ConnectionFactory
        {
            HostName = options.RabbitHost,
            Port = options.RabbitPort,
            UserName = options.RabbitUser,
            Password = options.RabbitPassword,
            AutomaticRecoveryEnabled = true,
            ConsumerDispatchConcurrency = 1,
            Ssl = { Enabled = options.RabbitTls, ServerName = options.RabbitHost }
        };

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var connection = await factory.CreateConnectionAsync(stoppingToken);
                await using var publish = await connection.CreateChannelAsync(
                    new CreateChannelOptions(publisherConfirmationsEnabled: true,
                        publisherConfirmationTrackingEnabled: true), stoppingToken);
                await using var consume = await connection.CreateChannelAsync(
                    new CreateChannelOptions(publisherConfirmationsEnabled: true,
                        publisherConfirmationTrackingEnabled: true), stoppingToken);
                await EnsureTopologyAsync(publish, stoppingToken);
                await consume.BasicQosAsync(0, 1, false, stoppingToken);
                var subscriber = new AsyncEventingBasicConsumer(consume);
                subscriber.ReceivedAsync += async (_, delivery) =>
                {
                    try
                    {
                        if (delivery.Body.Length > 64 ||
                            !Guid.TryParse(Encoding.UTF8.GetString(delivery.Body.Span), out var id) ||
                            id == Guid.Empty ||
                            delivery.BasicProperties.MessageId != id.ToString("D"))
                        {
                            await DeadLetterAndAckAsync(consume, delivery.DeliveryTag,
                                "malformed_envelope", stoppingToken);
                            return;
                        }

                        var disposition = await DeliverAsync(id, options, stoppingToken);
                        if (disposition == EmailDisposition.Retry)
                        {
                            // Bounded transient retry. SQL attempts remain durable;
                            // RabbitMQ requeues the original opaque GUID.
                            await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
                            await consume.BasicNackAsync(delivery.DeliveryTag,
                                multiple: false, requeue: true, cancellationToken: stoppingToken);
                        }
                        else if (disposition == EmailDisposition.Failed)
                        {
                            await DeadLetterAndAckAsync(consume, delivery.DeliveryTag,
                                "email_delivery_attempt_limit", stoppingToken);
                        }
                        else
                        {
                            await consume.BasicAckAsync(delivery.DeliveryTag, false, stoppingToken);
                        }
                    }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                    {
                        // Broker requeues any unacknowledged delivery on disconnect.
                    }
                    catch (Exception error)
                    {
                        LogConsumerError(logger, error.GetType().Name);
                        try
                        {
                            await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
                            await consume.BasicNackAsync(delivery.DeliveryTag,
                                multiple: false, requeue: true, cancellationToken: stoppingToken);
                        }
                        catch (Exception) when (stoppingToken.IsCancellationRequested) { }
                    }
                };
                await consume.BasicConsumeAsync(Queue, autoAck: false, subscriber,
                    cancellationToken: stoppingToken);

                while (!stoppingToken.IsCancellationRequested)
                {
                    await PublishPendingAsync(publish, stoppingToken);
                    await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
            catch (Exception error)
            {
                LogQueueDisconnected(logger, error.GetType().Name);
                try { await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken); }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
            }
        }
    }

    private static async Task EnsureTopologyAsync(IChannel channel, CancellationToken ct)
    {
        await channel.ExchangeDeclareAsync(Exchange, ExchangeType.Direct,
            durable: true, autoDelete: false, cancellationToken: ct);
        await channel.QueueDeclareAsync(Queue, durable: true,
            exclusive: false, autoDelete: false, cancellationToken: ct);
        await channel.QueueBindAsync(Queue, Exchange, RoutingKey, cancellationToken: ct);
        await channel.QueueDeclareAsync(DeadLetter, durable: true,
            exclusive: false, autoDelete: false, cancellationToken: ct);
    }

    private async Task PublishPendingAsync(IChannel channel, CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LongevityDietDbContext>();
        // Opt-in is captured at creation: historical/in-app-only notifications
        // default to None and will NEVER be retroactively emailed.
        var pending = await db.Notifications.AsNoTracking()
            .Where(x => x.EmailDeliveryStatus == "Pending" &&
                        x.EmailQueuedAtUtc == null && x.EmailDeliveryAttempts < MaxAttempts)
            .OrderBy(x => x.CreatedAtUtc)
            .Select(x => x.Id).Take(20).ToArrayAsync(ct);
        foreach (var id in pending)
        {
            var body = Encoding.UTF8.GetBytes(id.ToString("D"));
            var properties = new BasicProperties
            {
                ContentType = "text/plain",
                DeliveryMode = DeliveryModes.Persistent,
                MessageId = id.ToString("D")
            };
            await channel.BasicPublishAsync(Exchange, RoutingKey,
                mandatory: true, basicProperties: properties,
                body: body, cancellationToken: ct);
            // Publisher confirms: only record queued after the broker ACKs.
            await db.Notifications
                .Where(n => n.Id == id && n.EmailQueuedAtUtc == null &&
                            n.EmailDeliveryStatus == "Pending")
                .ExecuteUpdateAsync(setters => setters.SetProperty(
                    n => n.EmailQueuedAtUtc, clock.GetUtcNow().UtcDateTime), ct);
        }
    }

    private enum EmailDisposition { Ack, Retry, Failed }

    private async Task<EmailDisposition> DeliverAsync(
        Guid notificationId, EmailDeliveryConfiguration options, CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LongevityDietDbContext>();
        var now = clock.GetUtcNow().UtcDateTime;
        var row = await db.Notifications.AsNoTracking()
            .SingleOrDefaultAsync(n => n.Id == notificationId, ct);
        if (row is null || row.EmailDeliveryStatus is "Sent" or "None" or "Skipped" or "Failed")
            return EmailDisposition.Ack;

        var user = await db.Users.AsNoTracking()
            .SingleOrDefaultAsync(u => u.Id == row.UserId, ct);
        var pref = await db.ReminderPreferences.AsNoTracking()
            .SingleOrDefaultAsync(p => p.UserId == row.UserId, ct);

        if (user is not { Status: AccountStatus.Active } ||
            pref is not { OptedIn: true, EmailOptedIn: true } ||
            !options.CanSendTo(user.Email))
        {
            await db.Notifications.Where(n => n.Id == notificationId &&
                n.EmailDeliveryStatus != "Sent")
                .ExecuteUpdateAsync(s => s.SetProperty(n => n.EmailDeliveryStatus, "Skipped")
                    .SetProperty(n => n.EmailLeaseUntilUtc, (DateTime?)null), ct);
            return EmailDisposition.Ack;
        }

        if (row.EmailDeliveryAttempts >= MaxAttempts)
        {
            await SetFinalAsync(db, notificationId, "Failed", ct);
            return EmailDisposition.Failed;
        }

        // SQL compare-and-set lease prevents concurrent workers sending the
        // same message. Expired leases may retry after a process crash:
        // SMTP cannot guarantee exactly-once delivery across a network crash.
        var claimed = await db.Notifications.Where(n => n.Id == notificationId &&
            (n.EmailDeliveryStatus == "Pending" ||
             (n.EmailDeliveryStatus == "Sending" &&
              n.EmailLeaseUntilUtc < now)))
            .ExecuteUpdateAsync(s => s
                .SetProperty(n => n.EmailDeliveryStatus, "Sending")
                .SetProperty(n => n.EmailLeaseUntilUtc, now.AddMinutes(2))
                .SetProperty(n => n.EmailDeliveryAttempts, n => n.EmailDeliveryAttempts + 1), ct);
        if (claimed == 0)
        {
            // Another replica owns a non-expired lease.
            return EmailDisposition.Retry;
        }

        try
        {
            using var message = new MailMessage
            {
                From = new MailAddress(options.FromAddress, "LongevityDiet"),
                Subject = "Bạn có thông báo mới từ LongevityDiet",
                Body = "Bạn có một lời nhắc mới. Hãy đăng nhập ứng dụng để xem thông báo.\n\n" +
                    options.NotificationUrl +
                    "\n\nĐể tắt email, vào Lịch nhắc và thông báo trong ứng dụng.",
                IsBodyHtml = false
            };
            message.To.Add(new MailAddress(user.Email));

            using var client = new SmtpClient(options.SmtpHost, options.SmtpPort)
            {
                EnableSsl = options.SmtpTls,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                Timeout = 20000
            };
            if (!string.IsNullOrWhiteSpace(options.SmtpUser))
                client.Credentials = new NetworkCredential(options.SmtpUser, options.SmtpPassword);
            await client.SendMailAsync(message, ct);
            await db.Notifications.Where(n => n.Id == notificationId &&
                n.EmailDeliveryStatus == "Sending")
                .ExecuteUpdateAsync(s => s
                    .SetProperty(n => n.EmailDeliveryStatus, "Sent")
                    .SetProperty(n => n.EmailSentAtUtc, clock.GetUtcNow().UtcDateTime)
                    .SetProperty(n => n.EmailLeaseUntilUtc, (DateTime?)null), ct);
            LogSent(logger, notificationId);
            return EmailDisposition.Ack;
        }
        catch (Exception error) when (error is SmtpException or FormatException or InvalidOperationException)
        {
            // Never log address, body, SMTP credential or provider exception
            // message: SMTP errors can include personal or secret details.
            LogSmtpError(logger, error.GetType().Name);
            var attempts = row.EmailDeliveryAttempts + 1;
            var final = attempts >= MaxAttempts;
            await SetFinalAsync(db, notificationId, final ? "Failed" : "Pending", ct);
            return final ? EmailDisposition.Failed : EmailDisposition.Retry;
        }
    }

    private static async Task SetFinalAsync(LongevityDietDbContext db,
        Guid id, string status, CancellationToken ct)
    {
        await db.Notifications.Where(n => n.Id == id && n.EmailDeliveryStatus != "Sent")
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.EmailDeliveryStatus, status)
                .SetProperty(n => n.EmailLeaseUntilUtc, (DateTime?)null), ct);
    }

    private static async Task DeadLetterAndAckAsync(
        IChannel channel, ulong tag, string reason, CancellationToken ct)
    {
        // Only the non-sensitive reason is placed in the DLQ, not user data.
        var msg = Encoding.UTF8.GetBytes(reason);
        await channel.BasicPublishAsync(string.Empty, DeadLetter, mandatory: true,
            basicProperties: new BasicProperties
            {
                ContentType = "text/plain",
                DeliveryMode = DeliveryModes.Persistent
            }, body: msg, cancellationToken: ct);
        await channel.BasicAckAsync(tag, false, ct);
    }
}

/// <summary>
/// All parameters are read from environment/user secrets. No hardcoded SMTP
/// password or live Gmail address exists in this project.
/// </summary>
public sealed record EmailDeliveryConfiguration(
    string RabbitHost, int RabbitPort, string RabbitUser, string RabbitPassword, bool RabbitTls,
    string SmtpHost, int SmtpPort, bool SmtpTls, string SmtpUser, string SmtpPassword,
    string FromAddress, string NotificationUrl, string[] AllowedDomains, bool AllowAnyDomain)
{
    public bool CanSendTo(string email)
    {
        try
        {
            var address = new MailAddress(email);
            return string.Equals(email, address.Address, StringComparison.OrdinalIgnoreCase) &&
                (AllowAnyDomain || AllowedDomains.Contains(address.Host, StringComparer.OrdinalIgnoreCase));
        }
        catch (FormatException) { return false; }
    }

    public static EmailDeliveryConfiguration Read(
        IConfiguration config, IHostEnvironment environment)
    {
        var dev = environment.IsDevelopment() || environment.IsEnvironment("Testing");
        string Required(string key) => string.IsNullOrWhiteSpace(config[key])
            ? throw new InvalidOperationException("Email delivery requires " + key)
            : config[key]!;
        var rabbit = Required("RabbitMq:HostName");
        var user = Required("RabbitMq:UserName");
        var password = Required("RabbitMq:Password");
        var smtp = Required("EmailNotifications:SmtpHost");
        var from = Required("EmailNotifications:FromAddress");
        var baseUrl = Required("EmailNotifications:PublicBaseUrl");
        _ = new MailAddress(from);
        var uri = new Uri(baseUrl, UriKind.Absolute);
        var tls = config.GetValue("EmailNotifications:SmtpTls", true);
        var rabbitTls = config.GetValue("RabbitMq:UseTls", true);
        var smtpUser = config["EmailNotifications:SmtpUser"] ?? "";
        var smtpPassword = config["EmailNotifications:SmtpPassword"] ?? "";
        var allowed = (config["EmailNotifications:AllowedRecipientDomains"] ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var allowAny = config.GetValue<bool>("EmailNotifications:AllowAnyRecipientDomain");
        if (!dev && (!tls || !rabbitTls || uri.Scheme != "https" ||
                     string.IsNullOrWhiteSpace(smtpUser) ||
                     string.IsNullOrWhiteSpace(smtpPassword)))
            throw new InvalidOperationException(
                "Live SMTP/RabbitMQ delivery requires TLS, HTTPS and authenticated SMTP.");
        if (uri.Scheme is not ("https" or "http") || !string.IsNullOrWhiteSpace(uri.UserInfo))
            throw new InvalidOperationException("PublicBaseUrl must be an absolute safe URL.");
        if (!dev && uri.Scheme != "https")
            throw new InvalidOperationException("Production notification URL must use HTTPS.");
        if (allowed.Length == 0 && !allowAny)
            throw new InvalidOperationException(
                "Explicit AllowedRecipientDomains or AllowAnyRecipientDomain required.");
        return new EmailDeliveryConfiguration(
            rabbit, config.GetValue("RabbitMq:Port", rabbitTls ? 5671 : 5672),
            user, password, rabbitTls,
            smtp, config.GetValue("EmailNotifications:SmtpPort", tls ? 587 : 1025),
            tls, smtpUser, smtpPassword, from, new Uri(uri, "/notifications").AbsoluteUri,
            allowed, allowAny);
    }
}
