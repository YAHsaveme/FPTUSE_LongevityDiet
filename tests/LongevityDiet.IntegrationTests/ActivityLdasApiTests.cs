using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using LongevityDiet.Tracking;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LongevityDiet.IntegrationTests;

public sealed class ActivityLdasApiTests : IClassFixture<IntegrationTestWebApplicationFactory>
{
    private readonly IntegrationTestWebApplicationFactory _factory;

    public ActivityLdasApiTests(IntegrationTestWebApplicationFactory factory) =>
        _factory = factory;

    [Fact]
    public async Task Activities_RequireAccessTokenAndDoNotAcceptArbitraryUserId()
    {
        await _factory.ResetDatabaseAsync();
        using var anonymous = _factory.CreateHttpsClient();
        var response = await anonymous.GetAsync("/api/v1/activities");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var create = await anonymous.PostAsJsonAsync("/api/v1/activities",
            new { userId = Guid.NewGuid(), kind = 1, durationMinutes = 20, startedAt = DateTimeOffset.UtcNow });
        Assert.Equal(HttpStatusCode.Unauthorized, create.StatusCode);
    }


    [Fact]
    public async Task ActivityList_ServerSideFilterSearchSort_StaysOwnerScoped()
    {
        await _factory.ResetDatabaseAsync();
        using var alice = await AuthorizedClientAsync();
        using var bob = await AuthorizedClientAsync();
        var started = DateTimeOffset.UtcNow.AddHours(-1);
        foreach (var row in new[]
        {
            new { kind = 1, duration = 20, note = "Synthetic Walk", minutesAgo = 20 },
            new { kind = 2, duration = 45, note = "Synthetic Cycling", minutesAgo = 10 },
            new { kind = 1, duration = 30, note = "Other Walk", minutesAgo = 5 }
        })
        {
            var response = await alice.PostAsJsonAsync("/api/v1/activities", new
            {
                row.kind, durationMinutes = row.duration,
                startedAt = started.AddMinutes(-row.minutesAgo), row.note
            });
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }

        var list = await alice.GetAsync(
            "/api/v1/activities?page=1&pageSize=1&kind=1&search=Walk&sortBy=durationMinutes&sortDirection=desc");
        Assert.Equal(HttpStatusCode.OK, list.StatusCode);
        using (var body = JsonDocument.Parse(await list.Content.ReadAsStringAsync()))
        {
            Assert.Equal(2, body.RootElement.GetProperty("totalItems").GetInt32());
            Assert.Equal(2, body.RootElement.GetProperty("totalPages").GetInt32());
            Assert.Equal(30, body.RootElement.GetProperty("items")[0].GetProperty("durationMinutes").GetInt32());
        }
        var secondPage = await alice.GetAsync(
            "/api/v1/activities?page=2&pageSize=1&kind=1&search=Walk&sortBy=durationMinutes&sortDirection=desc");
        Assert.Equal(HttpStatusCode.OK, secondPage.StatusCode);
        using (var body = JsonDocument.Parse(await secondPage.Content.ReadAsStringAsync()))
            Assert.Equal(20, body.RootElement.GetProperty("items")[0].GetProperty("durationMinutes").GetInt32());
        var otherUser = await bob.GetAsync("/api/v1/activities?page=1&pageSize=20");
        using (var body = JsonDocument.Parse(await otherUser.Content.ReadAsStringAsync()))
            Assert.Equal(0, body.RootElement.GetProperty("totalItems").GetInt32());

        foreach (var invalid in new[] {
            "/api/v1/activities?kind=99",
            "/api/v1/activities?sortBy=unsafe",
            "/api/v1/activities?sortDirection=random",
            "/api/v1/activities?pageSize=101",
        })
            Assert.Equal(HttpStatusCode.BadRequest, (await alice.GetAsync(invalid)).StatusCode);
    }

    [Fact]
    public async Task ActivityCrud_IsUserOwned_AndSoftDeleteRecalculates()
    {
        await _factory.ResetDatabaseAsync();
        using var alice = await AuthorizedClientAsync();
        using var bob = await AuthorizedClientAsync();
        var today = DateTimeOffset.UtcNow.AddHours(-2);
        var create = await alice.PostAsJsonAsync("/api/v1/activities", new
        {
            kind = 1, durationMinutes = 30, startedAt = today, note = "Walk",
            userId = Guid.NewGuid(), // over-posting must be ignored
        });
        Assert.True(create.StatusCode == HttpStatusCode.Created, await create.Content.ReadAsStringAsync());
        var created = await create.Content.ReadFromJsonAsync<ActivityView>();
        Assert.NotNull(created);
        Assert.Equal(30, created.DurationMinutes);

        var aliceList = await alice.GetFromJsonAsync<PageView<ActivityView>>(
            "/api/v1/activities?page=1&pageSize=10");
        Assert.Single(aliceList!.Items);
        var bobList = await bob.GetFromJsonAsync<PageView<ActivityView>>(
            "/api/v1/activities?page=1&pageSize=10");
        Assert.Empty(bobList!.Items);

        var attempt = await bob.DeleteAsync($"/api/v1/activities/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, attempt.StatusCode);

        var update = await alice.PutAsJsonAsync($"/api/v1/activities/{created.Id}",
            new { kind = 4, durationMinutes = 25, startedAt = today, note = "Strength" });
        Assert.True(update.StatusCode == HttpStatusCode.OK, await update.Content.ReadAsStringAsync());

        var deleted = await alice.DeleteAsync($"/api/v1/activities/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        var empty = await alice.GetFromJsonAsync<PageView<ActivityView>>("/api/v1/activities");
        Assert.Empty(empty!.Items);
    }

    [Fact]
    public async Task ValidationAndPagination_AreBounded()
    {
        await _factory.ResetDatabaseAsync();
        using var client = await AuthorizedClientAsync();
        foreach (var minutes in new[] { -1, 0, 721 })
        {
            var result = await client.PostAsJsonAsync("/api/v1/activities",
                new { kind = 1, durationMinutes = minutes, startedAt = DateTimeOffset.UtcNow });
            Assert.Equal(HttpStatusCode.BadRequest, result.StatusCode);
            using var problem = JsonDocument.Parse(await result.Content.ReadAsStringAsync());
            Assert.Equal("invalid_duration", problem.RootElement.GetProperty("title").GetString());
        }

        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.GetAsync("/api/v1/activities?page=1&pageSize=101")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.PutAsJsonAsync("/api/v1/activities/goal",
                new { weeklyMinutesTarget = -1, weeklyStrengthSessionsTarget = 9 })).StatusCode);
    }

    [Fact]
    public async Task Ldas_UsesRealActivityOnlyAndDoesNotInventMealOrWindowObservations()
    {
        await _factory.ResetDatabaseAsync();
        using var client = await AuthorizedClientAsync();
        var utc = DateTimeOffset.UtcNow.AddHours(-3);
        var create = await client.PostAsJsonAsync("/api/v1/activities",
            new { kind = 2, durationMinutes = 40, startedAt = utc, note = "Jog" });
        Assert.True(create.StatusCode == HttpStatusCode.Created, await create.Content.ReadAsStringAsync());

        var date = DateOnly.FromDateTime(
            TimeZoneInfo.ConvertTime(utc, TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh")).DateTime);
        var score = await client.GetFromJsonAsync<ScoreView>($"/api/v1/ldas/{date:yyyy-MM-dd}");
        Assert.NotNull(score);
        Assert.True(score.IsPartial);
        Assert.Null(score.Score); // do not invent total LDAS with missing upstream data
        Assert.Equal(35m, score.CoveragePercent);
        Assert.False(score.IsClinical);
        Assert.Contains("meals", score.MissingData);
        Assert.Contains("eating_window", score.MissingData);
        Assert.Equal("ldas-v1", score.Version);
        Assert.Equal(3, score.Breakdown.Count);
    }

    [Fact]
    public async Task DailySummaryAndLatestScore_AreComputedFromStoredMemberEntries()
    {
        await _factory.ResetDatabaseAsync();
        using var client = await AuthorizedClientAsync();
        var now = DateTimeOffset.UtcNow;
        var startedAt = now.AddMinutes(-5);
        using var create = await client.PostAsJsonAsync("/api/v1/activities", new
        {
            kind = 1, durationMinutes = 25, startedAt, note = "Morning walk",
        });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var localDate = TrackingService.LocalDate(startedAt,
            TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh"));

        var summary = await client.GetFromJsonAsync<DailyActivitySummary>(
            $"/api/v1/activities/daily?date={localDate:yyyy-MM-dd}");
        Assert.NotNull(summary);
        Assert.Equal(localDate, summary.LocalDate);
        Assert.Equal(1, summary.ActivityCount);
        Assert.Equal(25, summary.EquivalentMinutes);
        Assert.Equal("Asia/Ho_Chi_Minh", summary.TimeZone);

        // Verify the persisted activity on its actual Asia/Ho_Chi_Minh day.
        // The /latest endpoint intentionally scores *today*, which may differ
        // from the activity day when the test runs around local midnight.
        var activityDateScore = await client.GetFromJsonAsync<ScoreView>(
            $"/api/v1/ldas/{localDate:yyyy-MM-dd}");
        Assert.NotNull(activityDateScore);
        Assert.True(activityDateScore.IsPartial);
        Assert.Null(activityDateScore.Score);
        Assert.Equal(localDate, activityDateScore.LocalDate);
        Assert.Equal(35m, activityDateScore.CoveragePercent);
        Assert.Single(activityDateScore.Breakdown,
            d => d.Code == "activity" && d.RawScore.HasValue);

        var latest = await client.GetFromJsonAsync<ScoreView>("/api/v1/ldas/latest");
        Assert.NotNull(latest);
        Assert.True(latest.IsPartial);
        Assert.Null(latest.Score);
        Assert.True(latest.LocalDate == localDate ||
                    latest.LocalDate == localDate.AddDays(1),
            $"Unexpected /latest date {latest.LocalDate} versus activity date {localDate}.");
        // Crossing midnight must not attribute yesterday's workout to today.
        Assert.Equal(latest.LocalDate == localDate ? 35m : 0m, latest.CoveragePercent);
        Assert.Equal(latest.LocalDate == localDate ? 1 : 0,
            latest.Breakdown.Count(d => d.Code == "activity" && d.RawScore.HasValue));
    }

    [Fact]
    public async Task WeeklySummaryAndGoal_UsePersistedActivity()
    {
        await _factory.ResetDatabaseAsync();
        using var client = await AuthorizedClientAsync();
        var goal = await client.PutAsJsonAsync("/api/v1/activities/goal",
            new { weeklyMinutesTarget = 210, weeklyStrengthSessionsTarget = 2 });
        Assert.Equal(HttpStatusCode.OK, goal.StatusCode);
        var fetchedGoal = await client.GetFromJsonAsync<GoalView>("/api/v1/activities/goal");
        Assert.Equal(210, fetchedGoal!.WeeklyMinutesTarget);

        // Anchor the summary to the ACTIVITY'S local Monday, not the current
        // week. On Sunday 17:00 UTC (Monday 00:00 in Ho Chi Minh City),
        // "one hour ago" legitimately belongs to the previous local week.
        var startedAt = DateTimeOffset.UtcNow.AddHours(-1);
        var localDate = TrackingService.LocalDate(startedAt,
            TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh"));
        var weekStart = localDate.AddDays(-(((int)localDate.DayOfWeek + 6) % 7));
        var create = await client.PostAsJsonAsync("/api/v1/activities",
            new { kind = 3, durationMinutes = 20, startedAt });
        Assert.True(create.StatusCode == HttpStatusCode.Created, await create.Content.ReadAsStringAsync());
        var summary = await client.GetFromJsonAsync<ActivitySummary>(
            $"/api/v1/activities/summary?weekStart={weekStart:yyyy-MM-dd}");
        Assert.NotNull(summary);
        Assert.Equal(weekStart, summary.WeekStart);
        Assert.True(summary.EquivalentMinutes >= 40);
        Assert.Equal(210, summary.WeeklyMinutesTarget);
    }

    [Fact]
    public async Task Score_RejectsFutureDates_AndConfigurationRemainsPublished()
    {
        await _factory.ResetDatabaseAsync();
        using var client = await AuthorizedClientAsync();
        var future = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(8));
        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.GetAsync($"/api/v1/ldas/{future:yyyy-MM-dd}")).StatusCode);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TrackingDbContext>();
        var config = await db.ScoreConfigurations.AsNoTracking().SingleAsync();
        Assert.Equal("ldas-v1", config.Version);
        Assert.True(config.Published);
    }

    private async Task<HttpClient> AuthorizedClientAsync()
    {
        var client = _factory.CreateHttpsClient();
        var registration = await client.PostAsJsonAsync("/api/v1/auth/register", new
        {
            email = $"tracking-{Guid.NewGuid():N}@example.test",
            password = "StrongPass123!",
            displayName = "Tracking Member",
        });
        Assert.Equal(HttpStatusCode.Created, registration.StatusCode);
        using var document = JsonDocument.Parse(await registration.Content.ReadAsStringAsync());
        var token = document.RootElement.GetProperty("accessToken").GetString();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }
}
