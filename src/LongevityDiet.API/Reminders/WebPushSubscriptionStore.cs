using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using StackExchange.Redis;

namespace LongevityDiet.API.Reminders;

/// <summary>
/// Web Push endpoint is a bearer-like capability URL and must never be logged
/// or shipped to a shared event broker. Redis AOF is an opt-in, 90-day
/// ephemeral per-device subscription store, scoped to authenticated UserId.
/// </summary>
public sealed class WebPushSubscriptionStore(IConfiguration config, TimeProvider clock)
{
    private const int MaxDevices = 5;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static bool Enabled(IConfiguration config) =>
        config.GetValue<bool>("WebPush:Enabled");

    public static WebPushDeliveryConfig Config(IConfiguration config)
    {
        var publicKey = config["WebPush:PublicKey"] ?? "";
        var privateKey = config["WebPush:PrivateKey"] ?? "";
        var subject = config["WebPush:Subject"] ?? "";
        if (!Enabled(config))
            throw new InvalidOperationException("Web Push transport has not been enabled.");
        if (DecodeUrlBase64(publicKey)?.Length != 65 ||
            DecodeUrlBase64(privateKey)?.Length != 32 ||
            !(subject.StartsWith("mailto:", StringComparison.OrdinalIgnoreCase) ||
              subject.StartsWith("https://", StringComparison.OrdinalIgnoreCase)) ||
            string.IsNullOrWhiteSpace(config["Redis:ConnectionString"]))
            throw new InvalidOperationException(
                "Web Push requires valid VAPID key pair, subject and Redis private connection.");
        return new(publicKey, privateKey, subject);
    }

    public static bool IsSafe(WebPushSubscriptionInput? input)
    {
        if (input?.Keys is null || string.IsNullOrWhiteSpace(input.Endpoint) ||
            input.Endpoint.Length > 2048 ||
            !Uri.TryCreate(input.Endpoint, UriKind.Absolute, out var url) ||
            url.Scheme != Uri.UriSchemeHttps || url.Port != 443 ||
            !string.IsNullOrEmpty(url.UserInfo) || !string.IsNullOrEmpty(url.Fragment))
            return false;

        var host = url.IdnHost.ToLowerInvariant();
        // Explicitly permitted browser push providers. No arbitrary URLs
        // (SSRF), loopback, IP address or user-provided network destinations.
        var knownHost = host is "fcm.googleapis.com"
            or "updates.push.services.mozilla.com"
            or "web.push.apple.com"
            or "wns.windows.com"
            || host.EndsWith(".notify.windows.com", StringComparison.Ordinal);
        return knownHost &&
            DecodeUrlBase64(input.Keys.P256dh)?.Length == 65 &&
            DecodeUrlBase64(input.Keys.Auth)?.Length == 16;
    }

    public static byte[]? DecodeUrlBase64(string? encoded)
    {
        if (string.IsNullOrEmpty(encoded) || encoded.Length > 512 ||
            encoded.Any(c => !(char.IsAsciiLetterOrDigit(c) || c is '-' or '_' or '=')))
            return null;
        try
        {
            var text = encoded.Replace('-', '+').Replace('_', '/');
            text = text.PadRight((text.Length + 3) / 4 * 4, '=');
            return Convert.FromBase64String(text);
        }
        catch (FormatException) { return null; }
    }

    public async Task<bool> SaveAsync(Guid userId, WebPushSubscriptionInput input)
    {
        if (userId == Guid.Empty || !IsSafe(input)) return false;
        using var mux = await ConnectionMultiplexer.ConnectAsync(
            config["Redis:ConnectionString"] ?? throw new InvalidOperationException(
                "Web Push Redis is not configured."));
        var db = mux.GetDatabase();
        var key = Key(userId);
        var field = Hash(input.Endpoint);
        if (!await db.HashExistsAsync(key, field) &&
            await db.HashLengthAsync(key) >= MaxDevices)
            return false;

        var subscription = new WebPushStoredSubscription(
            input.Endpoint, input.Keys.P256dh, input.Keys.Auth,
            clock.GetUtcNow().UtcDateTime);
        await db.HashSetAsync(key, field, JsonSerializer.Serialize(subscription, Json));
        await db.KeyExpireAsync(key, TimeSpan.FromDays(90));
        return true;
    }

    public async Task RemoveAsync(Guid userId, string endpoint)
    {
        if (userId == Guid.Empty || string.IsNullOrWhiteSpace(endpoint)) return;
        using var mux = await ConnectionMultiplexer.ConnectAsync(
            config["Redis:ConnectionString"] ?? throw new InvalidOperationException(
                "Web Push Redis is not configured."));
        await mux.GetDatabase().HashDeleteAsync(Key(userId), Hash(endpoint));
    }

    public async Task<int> CountAsync(Guid userId)
    {
        using var mux = await ConnectionMultiplexer.ConnectAsync(
            config["Redis:ConnectionString"] ?? throw new InvalidOperationException(
                "Web Push Redis is not configured."));
        return (int)await mux.GetDatabase().HashLengthAsync(Key(userId));
    }

    public static async Task<WebPushStoredSubscription[]> ReadAsync(
        IDatabase db, Guid userId)
    {
        var entries = await db.HashGetAllAsync(Key(userId));
        var subscriptions = new List<WebPushStoredSubscription>(entries.Length);
        foreach (var entry in entries)
        {
            try
            {
                var item = JsonSerializer.Deserialize<WebPushStoredSubscription>(
                    entry.Value.ToString(), Json);
                if (item is not null &&
                    IsSafe(new(item.Endpoint, new(item.P256dh, item.Auth))))
                    subscriptions.Add(item);
            }
            catch (JsonException) { /* Ignore invalid cached entry. */ }
        }
        return subscriptions.ToArray();
    }

    public static string Key(Guid userId) => "ldc:webpush:subscriptions:" + userId.ToString("N");

    public static string Hash(string endpoint) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(endpoint)))
            .ToLowerInvariant();
}

public sealed record WebPushSubscriptionKeys(string P256dh, string Auth);
public sealed record WebPushSubscriptionInput(string Endpoint, WebPushSubscriptionKeys Keys);
public sealed record WebPushUnsubscribeInput(string Endpoint);
public sealed record WebPushStoredSubscription(
    string Endpoint, string P256dh, string Auth, DateTime SubscribedAtUtc);
public sealed record WebPushDeliveryConfig(string PublicKey, string PrivateKey, string Subject);
