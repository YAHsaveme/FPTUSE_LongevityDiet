using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using LongevityDiet.Domain.Entities;
using LongevityDiet.Repositories;
using LongevityDiet.Services.Reminders;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace LongevityDiet.IntegrationTests;

public sealed class ReminderNotificationsApiTests : IClassFixture<IntegrationTestWebApplicationFactory>
{
    private readonly IntegrationTestWebApplicationFactory _factory;
    public ReminderNotificationsApiTests(IntegrationTestWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task Preferences_DefaultOptOut_AndRequiresBearer()
    {
        await _factory.ResetDatabaseAsync();
        using var anonymous = _factory.CreateHttpsClient();
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await anonymous.GetAsync("/api/v1/reminders/preferences")).StatusCode);
        using var client = await AuthClientAsync();
        var pref = await client.GetFromJsonAsync<ReminderPreferencesView>("/api/v1/reminders/preferences");
        Assert.NotNull(pref);
        Assert.False(pref.OptedIn);
        Assert.False(pref.EmailOptedIn);
        Assert.Empty((await client.GetFromJsonAsync<ReminderScheduleItem[]>(
            "/api/v1/reminders/preview"))!);
    }

    [Fact]
    public async Task PreferenceUpdate_IsVersionedAndOutboxIsTransactional()
    {
        await _factory.ResetDatabaseAsync();
        using var client = await AuthClientAsync();
        var body = new
        {
            optedIn = true,
            mealLoggingEnabled = true,
            activityEnabled = true,
            challengeEnabled = false,
            weeklySummaryEnabled = true,
            mealTime = "20:00:00",
            activityTime = "18:30:00",
            challengeTime = "21:00:00",
            weeklySummaryTime = "09:00:00",
            quietStart = "22:00:00",
            quietEnd = "07:00:00",
        };
        var update1 = await client.PutAsJsonAsync("/api/v1/reminders/preferences", body);
        Assert.Equal(HttpStatusCode.OK, update1.StatusCode);
        var first = await update1.Content.ReadFromJsonAsync<ReminderPreferencesView>();
        Assert.Equal(1, first!.Version);
        var preview = await client.GetFromJsonAsync<ReminderScheduleItem[]>("/api/v1/reminders/preview");
        Assert.Equal(3, preview!.Length);

        var update2 = await client.PutAsJsonAsync("/api/v1/reminders/preferences", body);
        Assert.Equal(HttpStatusCode.OK, update2.StatusCode);
        var second = await update2.Content.ReadFromJsonAsync<ReminderPreferencesView>();
        Assert.Equal(2, second!.Version);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LongevityDietDbContext>();
        Assert.Equal(2, await db.IdentityOutbox.CountAsync());
        Assert.All(await db.IdentityOutbox.ToListAsync(),
            row => Assert.Equal("ReminderPreferenceUpdated.v1", row.EventType));
    }

    [Fact]
    public async Task ProfileTimeZoneChange_AtomicallyReschedulesExistingReminder()
    {
        await _factory.ResetDatabaseAsync();
        using var client = await AuthClientAsync();
        var update = await client.PutAsJsonAsync("/api/v1/reminders/preferences", new
        {
            optedIn = true,
            mealLoggingEnabled = true,
            activityEnabled = true,
            challengeEnabled = false,
            weeklySummaryEnabled = false,
            mealTime = "20:00:00",
            activityTime = "18:30:00",
            challengeTime = "21:00:00",
            weeklySummaryTime = "09:00:00",
            quietStart = "22:00:00",
            quietEnd = "07:00:00",
        });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        var profile = await client.PutAsJsonAsync("/api/v1/profile", new
        {
            displayName = "Reminder Member",
            birthYear = 2003,
            timeZone = "UTC",
            wakeTime = "07:00:00",
            sleepTime = "23:00:00",
            preferredMealFrequency = 3,
            foodPreference = "Plant-forward",
        });
        Assert.Equal(HttpStatusCode.OK, profile.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LongevityDietDbContext>();
        var preference = await db.ReminderPreferences.SingleAsync();
        Assert.Equal(2, preference.Version);
        var events = await db.IdentityOutbox.OrderBy(e => e.CreatedAtUtc).ToArrayAsync();
        Assert.Equal(2, events.Length);
        using var payload = JsonDocument.Parse(events[1].PayloadJson);
        Assert.Equal("UTC", payload.RootElement.GetProperty("timeZone").GetString());
        Assert.Equal(2, payload.RootElement.GetProperty("Version").GetInt32());
    }

    [Fact]
    public async Task NotificationResult_IsUserOwnedReadOnce_AndReplayProof()
    {
        await _factory.ResetDatabaseAsync();
        using var alice = await AuthClientAsync();
        using var bob = await AuthClientAsync();

        var pref = new ReminderPreferencesInput(
            true, true, true, false, false,
            new TimeOnly(20,0), new TimeOnly(18,30), new TimeOnly(21,0),
            new TimeOnly(9,0), new TimeOnly(22,0), new TimeOnly(7,0));
        using var scope = _factory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<ReminderService>();
        var db = scope.ServiceProvider.GetRequiredService<LongevityDietDbContext>();
        var aliceId = (await db.Users.AsNoTracking()
            .Where(u => u.Email.StartsWith("reminder-")).ToListAsync())
            .OrderBy(u => u.CreatedAt).First().Id;

        await service.UpdatePreferencesAsync(aliceId, pref, default);
        var e = new NotificationReadyEvent(
            Guid.NewGuid(), aliceId, ReminderCategory.Activity,
            "Nhắc vận động", "Bạn có thể ghi lại vận động hôm nay.",
            "/activity", "activity-2026-11-05");
        Assert.True(await service.PersistNotificationResultAsync(e, default));
        Assert.False(await service.PersistNotificationResultAsync(e, default));
        // Different EventId but same business window must not create duplicates.
        Assert.False(await service.PersistNotificationResultAsync(
            e with { EventId = Guid.NewGuid() }, default));

        var list = await alice.GetFromJsonAsync<NotificationPage>("/api/v1/notifications");
        Assert.Single(list!.Items);
        var item = list.Items[0];
        Assert.Equal("/activity", item.DeepLink);
        var otherList = await bob.GetFromJsonAsync<NotificationPage>("/api/v1/notifications");
        Assert.Empty(otherList!.Items);

        var forbidden = await bob.PostAsync($"/api/v1/notifications/{item.Id}/read", null);
        Assert.Equal(HttpStatusCode.NotFound, forbidden.StatusCode);
        var unread = await alice.GetFromJsonAsync<JsonElement>("/api/v1/notifications/unread-count");
        Assert.Equal(1, unread.GetProperty("count").GetInt32());
        var read = await alice.PostAsync($"/api/v1/notifications/{item.Id}/read", null);
        Assert.Equal(HttpStatusCode.NoContent, read.StatusCode);
        var afterRead = await alice.GetFromJsonAsync<JsonElement>("/api/v1/notifications/unread-count");
        Assert.Equal(0, afterRead.GetProperty("count").GetInt32());
    }

    [Fact]
    public async Task DisabledNotificationCategory_IsRejectedEvenWhenGlobalOptInIsTrue()
    {
        await _factory.ResetDatabaseAsync();
        using var client = await AuthClientAsync();
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LongevityDietDbContext>();
        var userId = await db.Users.AsNoTracking().Select(u => u.Id).SingleAsync();
        var service = scope.ServiceProvider.GetRequiredService<ReminderService>();
        await service.UpdatePreferencesAsync(userId, new ReminderPreferencesInput(
            true, false, true, false, false,
            new TimeOnly(20, 0), new TimeOnly(18, 30),
            new TimeOnly(21, 0), new TimeOnly(9, 0),
            new TimeOnly(22, 0), new TimeOnly(7, 0)), default);

        var mealReminder = new NotificationReadyEvent(
            Guid.NewGuid(), userId, ReminderCategory.MealLogging,
            "Nhắc bữa ăn", "Bạn có thể ghi bữa ăn.", "/app",
            "meal-20261105");
        Assert.False(await service.PersistNotificationResultAsync(mealReminder, default));
        Assert.Empty((await client.GetFromJsonAsync<NotificationPage>("/api/v1/notifications"))!.Items);
        // The discarded source event is acknowledged idempotently, not retried forever.
        Assert.Equal(1, await db.IdentityInbox.CountAsync());

        var allowed = mealReminder with
        {
            EventId = Guid.NewGuid(),
            Category = ReminderCategory.Activity,
            DeduplicationKey = "activity-20261105",
            DeepLink = "/activity",
        };
        Assert.True(await service.PersistNotificationResultAsync(allowed, default));
        Assert.Single((await client.GetFromJsonAsync<NotificationPage>("/api/v1/notifications"))!.Items);
    }

    [Fact]
    public async Task NotificationInput_IsRestrictedToAllowedDeepLinks()
    {
        await _factory.ResetDatabaseAsync();
        using var client = await AuthClientAsync();
        using var scope = _factory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<ReminderService>();
        var user = await scope.ServiceProvider.GetRequiredService<LongevityDietDbContext>()
            .Users.AsNoTracking().SingleAsync();
        await Assert.ThrowsAsync<ReminderAccessException>(() =>
            service.PersistNotificationResultAsync(new NotificationReadyEvent(
                Guid.NewGuid(), user.Id, ReminderCategory.Activity, "Title",
                "Content", "https://phishing.invalid", "valid-key"), default));
    }

    [Fact]
    public async Task EmailNotifications_RequireSeparateConsent_AndNeverBackfillOldRows()
    {
        await _factory.ResetDatabaseAsync();
        using var client = await AuthClientAsync();
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LongevityDietDbContext>();
        var userId = await db.Users.AsNoTracking().Select(x => x.Id).SingleAsync();
        var service = scope.ServiceProvider.GetRequiredService<ReminderService>();
        var pref = new ReminderPreferencesInput(
            true, true, true, true, true,
            new TimeOnly(20, 0), new TimeOnly(18, 30),
            new TimeOnly(21, 0), new TimeOnly(9, 0),
            new TimeOnly(22, 0), new TimeOnly(7, 0),
            EmailOptedIn: false);
        await service.UpdatePreferencesAsync(userId, pref, default);

        var first = new NotificationReadyEvent(Guid.NewGuid(), userId,
            ReminderCategory.Activity, "Synthetic QA reminder", "Generic text",
            "/activity", "qa-no-email-1");
        Assert.True(await service.PersistNotificationResultAsync(first, default));
        Assert.Equal("None", (await db.Notifications.AsNoTracking()
            .SingleAsync(x => x.DeduplicationKey == first.DeduplicationKey)).EmailDeliveryStatus);

        await service.UpdatePreferencesAsync(userId,
            pref with { EmailOptedIn = true }, default);
        var enabled = await client.GetFromJsonAsync<ReminderPreferencesView>(
            "/api/v1/reminders/preferences");
        Assert.True(enabled!.EmailOptedIn);
        var second = first with { EventId = Guid.NewGuid(), DeduplicationKey = "qa-unverified-2" };
        Assert.True(await service.PersistNotificationResultAsync(second, default));
        Assert.Equal("None", (await db.Notifications.AsNoTracking()
            .SingleAsync(x => x.DeduplicationKey == second.DeduplicationKey)).EmailDeliveryStatus);

        // Proof of email ownership is independent from opt-in consent.
        var account = await db.Users.SingleAsync(x => x.Id == userId);
        Assert.Null(account.EmailVerifiedAtUtc);
        account.EmailVerifiedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var third = first with { EventId = Guid.NewGuid(), DeduplicationKey = "qa-verified-3" };
        Assert.True(await service.PersistNotificationResultAsync(third, default));
        var pending = await db.Notifications.AsNoTracking()
            .SingleAsync(x => x.DeduplicationKey == third.DeduplicationKey);
        Assert.Equal("Pending", pending.EmailDeliveryStatus);
        Assert.Null(pending.EmailQueuedAtUtc);
        Assert.Equal(0, pending.EmailDeliveryAttempts);
        Assert.False(await service.PersistNotificationResultAsync(third, default));

        await service.UpdatePreferencesAsync(userId,
            pref with { EmailOptedIn = false }, default);
        var fourth = first with { EventId = Guid.NewGuid(), DeduplicationKey = "qa-opted-out-4" };
        Assert.True(await service.PersistNotificationResultAsync(fourth, default));
        Assert.Equal("None", (await db.Notifications.AsNoTracking()
            .SingleAsync(x => x.DeduplicationKey == fourth.DeduplicationKey)).EmailDeliveryStatus);

        var messages = await client.GetFromJsonAsync<NotificationPage>("/api/v1/notifications");
        Assert.Equal(4, messages!.Items.Count);
        Assert.Contains(messages.Items, x => x.EmailDeliveryStatus == "Pending");
        Assert.Equal(3, messages.Items.Count(x => x.EmailDeliveryStatus == "None"));
    }

    [Fact]
    public void SmtpEmailConfiguration_IsExplicitAndRecipientAllowlisted()
    {
        var config = new Microsoft.Extensions.Configuration.ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["RabbitMq:HostName"] = "rabbitmq",
                ["RabbitMq:UserName"] = "synthetic-qa",
                ["RabbitMq:Password"] = "synthetic-only",
                ["RabbitMq:UseTls"] = "false",
                ["EmailNotifications:SmtpHost"] = "mailpit",
                ["EmailNotifications:SmtpPort"] = "1025",
                ["EmailNotifications:SmtpTls"] = "false",
                ["EmailNotifications:FromAddress"] = "sender@longevitydiet.test",
                ["EmailNotifications:PublicBaseUrl"] = "http://localhost:5173",
                ["EmailNotifications:AllowedRecipientDomains"] = "example.test"
            }).Build();
        var environment = _factory.Services.GetRequiredService<Microsoft.Extensions.Hosting.IHostEnvironment>();
        var options = LongevityDiet.API.Reminders.EmailDeliveryConfiguration.Read(config, environment);
        Assert.True(options.CanSendTo("synthetic@example.test"));
        Assert.False(options.CanSendTo("someone@gmail.com"));
        Assert.False(options.CanSendTo("malformed-not-an-email"));
    }

    private async Task<HttpClient> AuthClientAsync()
    {
        var client = _factory.CreateHttpsClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new
        {
            email = $"reminder-{Guid.NewGuid():N}@example.test",
            password = "StrongPass123!",
            displayName = "Reminder Member",
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var token = json.RootElement.GetProperty("accessToken").GetString();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }
}
