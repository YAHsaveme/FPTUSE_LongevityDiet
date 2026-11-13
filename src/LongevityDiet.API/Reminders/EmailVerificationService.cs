using System.Globalization;
using System.Net;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using LongevityDiet.Domain.Entities;
using LongevityDiet.Repositories;
using Microsoft.EntityFrameworkCore;

namespace LongevityDiet.API.Reminders;

/// <summary>
/// Proof of mailbox ownership for reminders, separate from permission to
/// receive reminders. Never activate email delivery based only on a typed
/// address or opt-in checkbox. Previous/legacy users are unverified by default.
/// </summary>
public sealed class EmailVerificationService(
    LongevityDietDbContext db, IConfiguration configuration,
    IHostEnvironment environment, TimeProvider clock)
{
    private const int CodeDigits = 6;
    private const int MaxAttempts = 5;
    private static readonly TimeSpan Cooldown = TimeSpan.FromMinutes(2);
    private static readonly TimeSpan Expiry = TimeSpan.FromMinutes(15);

    public static bool Enabled(IConfiguration config) =>
        config.GetValue<bool>("EmailVerification:Enabled");

    public static void EnsureConfigured(IConfiguration config, IHostEnvironment environment)
    {
        if (!Enabled(config)) return;
        if (!config.GetValue<bool>("EmailNotifications:Enabled"))
            throw new InvalidOperationException(
                "Email verification requires EmailNotifications:Enabled and a configured SMTP provider.");
        var value = config["EmailVerification:HashKeyBase64"];
        try
        {
            if (Convert.FromBase64String(value ?? "").Length < 32)
                throw new InvalidOperationException(
                    "Email verification requires a random secret of at least 32 bytes.");
        }
        catch (FormatException)
        {
            throw new InvalidOperationException(
                "Email verification secret must be valid base64.");
        }
        _ = EmailDeliveryConfiguration.Read(config, environment);
    }

    private byte[] GetHashKey()
    {
        var raw = configuration["EmailVerification:HashKeyBase64"];
        byte[] bytes;
        try { bytes = Convert.FromBase64String(raw ?? ""); }
        catch (FormatException)
        {
            throw new InvalidOperationException(
                "EmailVerification:HashKeyBase64 must be 32+ random bytes in a secret store.");
        }
        if (bytes.Length < 32)
            throw new InvalidOperationException(
                "EmailVerification:HashKeyBase64 must be 32+ random bytes in a secret store.");
        return bytes;
    }

    public static string HashCode(byte[] hashKey, Guid userId, string normalizedEmail,
        string code)
    {
        if (hashKey.Length < 32 || code.Length != CodeDigits ||
            code.Any(c => c is < '0' or > '9'))
            throw new ArgumentException("Invalid verification proof.");
        var input = Encoding.UTF8.GetBytes(userId.ToString("N") +
            ":" + normalizedEmail + ":" + code);
        return Convert.ToHexString(HMACSHA256.HashData(hashKey, input));
    }

    public async Task<EmailVerificationStatus> StatusAsync(Guid userId, CancellationToken ct)
    {
        var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == userId, ct);
        if (user is not { Status: AccountStatus.Active })
            return new(false, false, 0, "inactive_user");
        var now = clock.GetUtcNow().UtcDateTime;
        var remaining = user.EmailVerificationLastSentAtUtc is { } last
            ? (int)Math.Max(0, Math.Ceiling((last.Add(Cooldown) - now).TotalSeconds))
            : 0;
        return new(Enabled(configuration), user.EmailVerifiedAtUtc is not null,
            remaining, null);
    }

    public async Task<EmailVerificationResult> RequestAsync(Guid userId, CancellationToken ct)
    {
        if (!Enabled(configuration))
            return new(503, "verification_not_configured");
        var key = GetHashKey();
        // Fail closed if SMTP provider/TLS and sender restrictions are missing.
        var options = EmailDeliveryConfiguration.Read(configuration, environment);
        var user = await db.Users.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == userId, ct);
        if (user is not { Status: AccountStatus.Active })
            return new(403, "inactive_user");
        if (user.EmailVerifiedAtUtc is not null)
            return new(200, "already_verified");
        if (!options.CanSendTo(user.Email))
            return new(403, "recipient_not_allowed");
        var now = clock.GetUtcNow().UtcDateTime;
        if (user.EmailVerificationLastSentAtUtc is { } sent &&
            sent.Add(Cooldown) > now)
            return new(429, "retry_later");

        var code = RandomNumberGenerator.GetInt32(0, 1_000_000)
            .ToString("D6", CultureInfo.InvariantCulture);
        var hash = HashCode(key, userId, user.NormalizedEmail, code);

        // Atomic throttle: one active code per account and at least two
        // minutes between successful sends, including concurrent requests.
        var claimed = await db.Users
            .Where(x => x.Id == userId &&
                x.Status == AccountStatus.Active &&
                x.EmailVerifiedAtUtc == null &&
                (x.EmailVerificationLastSentAtUtc == null ||
                 x.EmailVerificationLastSentAtUtc <= now.Subtract(Cooldown)))
            .ExecuteUpdateAsync(set => set
                .SetProperty(x => x.EmailVerificationHash, hash)
                .SetProperty(x => x.EmailVerificationExpiresAtUtc, now.Add(Expiry))
                .SetProperty(x => x.EmailVerificationLastSentAtUtc, now)
                .SetProperty(x => x.EmailVerificationAttempts, 0), ct);
        if (claimed == 0) return new(429, "retry_later");

        try
        {
            using var message = new MailMessage
            {
                From = new MailAddress(options.FromAddress, "LongevityDiet"),
                Subject = "Mã xác minh email LongevityDiet",
                Body = "Mã xác minh của bạn: " + code +
                    "\nMã có hiệu lực trong 15 phút. Không cung cấp mã này cho người khác." +
                    "\nNếu bạn không yêu cầu, hãy bỏ qua email này.",
                IsBodyHtml = false
            };
            message.To.Add(new MailAddress(user.Email));
            using var smtp = new SmtpClient(options.SmtpHost, options.SmtpPort)
            {
                DeliveryMethod = SmtpDeliveryMethod.Network,
                EnableSsl = options.SmtpTls,
                Timeout = 20000
            };
            if (!string.IsNullOrWhiteSpace(options.SmtpUser))
                smtp.Credentials = new NetworkCredential(options.SmtpUser,
                    options.SmtpPassword);
            await smtp.SendMailAsync(message, ct);
            return new(202, "verification_sent");
        }
        catch (Exception ex) when (ex is SmtpException or InvalidOperationException
            or FormatException)
        {
            // Clear only OUR still-current code: no dead challenge after SMTP
            // failure, and do not log user address, OTP or provider response.
            await db.Users.Where(u => u.Id == userId &&
                    u.EmailVerificationHash == hash && u.EmailVerifiedAtUtc == null)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(u => u.EmailVerificationHash, (string?)null)
                    .SetProperty(u => u.EmailVerificationExpiresAtUtc, (DateTime?)null)
                    .SetProperty(u => u.EmailVerificationLastSentAtUtc, (DateTime?)null), ct);
            return new(503, "mail_transport_unavailable");
        }
    }

    public async Task<EmailVerificationResult> ConfirmAsync(
        Guid userId, string code, CancellationToken ct)
    {
        if (!Enabled(configuration)) return new(503, "verification_not_configured");
        if (code.Length != CodeDigits || code.Any(c => c is < '0' or > '9'))
            return new(400, "invalid_code");
        var key = GetHashKey();
        var user = await db.Users.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == userId, ct);
        if (user is not { Status: AccountStatus.Active })
            return new(403, "inactive_user");
        if (user.EmailVerifiedAtUtc is not null)
            return new(200, "already_verified");

        var now = clock.GetUtcNow().UtcDateTime;
        if (user.EmailVerificationHash is null ||
            user.EmailVerificationExpiresAtUtc is null ||
            user.EmailVerificationExpiresAtUtc <= now)
            return new(400, "code_expired_or_missing");
        if (user.EmailVerificationAttempts >= MaxAttempts)
            return new(429, "too_many_attempts");

        var attempted = HashCode(key, userId, user.NormalizedEmail, code);
        var correct = CryptographicOperations.FixedTimeEquals(
            Convert.FromHexString(user.EmailVerificationHash),
            Convert.FromHexString(attempted));
        if (!correct)
        {
            await db.Users.Where(x => x.Id == userId &&
                    x.EmailVerificationHash == user.EmailVerificationHash &&
                    x.EmailVerifiedAtUtc == null &&
                    x.EmailVerificationAttempts < MaxAttempts)
                .ExecuteUpdateAsync(set => set.SetProperty(
                    x => x.EmailVerificationAttempts,
                    x => x.EmailVerificationAttempts + 1), ct);
            return new(400, "invalid_code");
        }

        var updated = await db.Users
            .Where(x => x.Id == userId &&
                x.EmailVerifiedAtUtc == null &&
                x.EmailVerificationHash == attempted &&
                x.EmailVerificationExpiresAtUtc > now &&
                x.EmailVerificationAttempts < MaxAttempts)
            .ExecuteUpdateAsync(s => s
                .SetProperty(x => x.EmailVerifiedAtUtc, now)
                .SetProperty(x => x.EmailVerificationHash, (string?)null)
                .SetProperty(x => x.EmailVerificationExpiresAtUtc, (DateTime?)null)
                .SetProperty(x => x.EmailVerificationAttempts, 0), ct);

        return updated == 1 ? new(200, "email_verified")
            : new(400, "code_expired_or_missing");
    }
}

public sealed record EmailVerificationStatus(bool Enabled, bool Verified,
    int RetryAfterSeconds, string? Error);
public sealed record EmailVerificationResult(int Status, string Code);
public sealed record EmailVerificationConfirmRequest(string Code);
