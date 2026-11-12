using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LongevityDiet.API.Reminders;
using Microsoft.Extensions.Configuration;

namespace LongevityDiet.IntegrationTests;

public sealed class WebPushSecurityTests : IClassFixture<IntegrationTestWebApplicationFactory>
{
    private readonly IntegrationTestWebApplicationFactory factory;
    public WebPushSecurityTests(IntegrationTestWebApplicationFactory factory) =>
        this.factory = factory;

    private static WebPushSubscriptionInput Subscription(string endpoint)
    {
        var publicKey = new byte[65];
        publicKey[0] = 4;
        return new WebPushSubscriptionInput(endpoint, new(
            Convert.ToBase64String(publicKey).TrimEnd('=').Replace('+', '-').Replace('/', '_'),
            Convert.ToBase64String(new byte[16]).TrimEnd('=').Replace('+', '-').Replace('/', '_')));
    }

    [Theory]
    [InlineData("https://fcm.googleapis.com/fcm/send/synthetic", true)]
    [InlineData("https://updates.push.services.mozilla.com/wpush/v2/synthetic", true)]
    [InlineData("https://web.push.apple.com/synthetic", true)]
    [InlineData("https://fcm.googleapis.com.evil.example.test/push", false)]
    [InlineData("https://example.com/push", false)]
    [InlineData("http://fcm.googleapis.com/push", false)]
    [InlineData("https://127.0.0.1/push", false)]
    [InlineData("https://localhost:443/push", false)]
    [InlineData("https://fcm.googleapis.com:444/push", false)]
    [InlineData("https://user@fcm.googleapis.com/push", false)]
    public void OnlyTrustedHttpsPushProvidersMayBeSubscribed(string endpoint, bool expected)
    {
        Assert.Equal(expected,
            WebPushSubscriptionStore.IsSafe(Subscription(endpoint)));
    }

    [Fact]
    public void MissingOrMalformedEncryptionKeysAreRejected()
    {
        var good = Subscription("https://fcm.googleapis.com/fcm/send/synthetic");
        Assert.False(WebPushSubscriptionStore.IsSafe(
            good with { Keys = new WebPushSubscriptionKeys("bad", "bad") }));
        Assert.False(WebPushSubscriptionStore.IsSafe(
            good with { Endpoint = "https://fcm.googleapis.com/#not-a-push-endpoint" }));
        Assert.False(WebPushSubscriptionStore.IsSafe(null));
    }

    [Fact]
    public void VapidPrivateKeyAndRedisAreRequiredForOptIn()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["WebPush:Enabled"] = "true",
                ["WebPush:PublicKey"] = "not-a-valid-vapid-key",
                ["WebPush:PrivateKey"] = "must-be-secret",
                ["WebPush:Subject"] = "mailto:test@example.test",
                ["Redis:ConnectionString"] = "redis:6379"
            }).Build();
        Assert.Throws<InvalidOperationException>(() =>
            WebPushSubscriptionStore.Config(cfg));
    }

    [Fact]
    public async Task PushIsDisabledByDefaultAndConfigurationRequiresJwt()
    {
        await factory.ResetDatabaseAsync();
        using var unauthenticated = factory.CreateHttpsClient();
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await unauthenticated.GetAsync("/api/v1/web-push/config")).StatusCode);
        using var client = factory.CreateHttpsClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new
        {
            email = $"webpush-{Guid.NewGuid():N}@example.test",
            displayName = "Web Push QA User", password = "StrongPass123!"
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer",
                json.RootElement.GetProperty("accessToken").GetString());

        var config = await client.GetFromJsonAsync<JsonElement>("/api/v1/web-push/config");
        Assert.False(config.GetProperty("enabled").GetBoolean());
        Assert.Equal(JsonValueKind.Null, config.GetProperty("vapidPublicKey").ValueKind);

        var rejected = await client.PostAsJsonAsync("/api/v1/web-push/subscriptions",
            Subscription("https://fcm.googleapis.com/fcm/send/synthetic"));
        Assert.Equal(HttpStatusCode.ServiceUnavailable, rejected.StatusCode);
    }
}
