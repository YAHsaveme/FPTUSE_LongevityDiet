using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using LongevityDiet.Domain.Entities;
using LongevityDiet.Repositories;
using LongevityDiet.Tracking;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LongevityDiet.IntegrationTests;

public sealed class TrackingMealWindowSourceTests : IClassFixture<IntegrationTestWebApplicationFactory>
{
    private readonly IntegrationTestWebApplicationFactory _factory;

    public TrackingMealWindowSourceTests(IntegrationTestWebApplicationFactory factory) =>
        _factory = factory;

    [Fact]
    public async Task RealOwnerMealLogsAndEatingWindow_AreUsedByVersionedLdas_NotFabricatedOrStale()
    {
        await _factory.ResetDatabaseAsync();
        using var client = _factory.CreateHttpsClient();
        var register = await client.PostAsJsonAsync("/api/v1/auth/register", new
        {
            email = $"ldas-real-{Guid.NewGuid():N}@example.test",
            password = "StrongPass123!",
            displayName = "Educational LDAS QA",
        });
        Assert.Equal(HttpStatusCode.Created, register.StatusCode);
        using var registration = JsonDocument.Parse(await register.Content.ReadAsStringAsync());
        var userId = registration.RootElement.GetProperty("user").GetProperty("id").GetGuid();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer", registration.RootElement.GetProperty("accessToken").GetString());

        var profile = await client.PutAsJsonAsync("/api/v1/profile", new
        {
            displayName = "Educational LDAS QA",
            birthYear = 1996,
            timeZone = "Asia/Ho_Chi_Minh",
            wakeTime = "06:30:00",
            sleepTime = "23:00:00",
            preferredMealFrequency = 3,
            foodPreference = "Plant-forward Vietnamese",
        });
        Assert.Equal(HttpStatusCode.OK, profile.StatusCode);

        var activity = await client.PostAsJsonAsync("/api/v1/activities", new
        {
            kind = 1,
            durationMinutes = 35,
            startedAt = DateTimeOffset.UtcNow.AddMinutes(-2),
            note = "Synthetic educational activity"
        });
        Assert.Equal(HttpStatusCode.Created, activity.StatusCode);

        var baseline = await client.GetFromJsonAsync<ScoreView>("/api/v1/ldas/latest");
        Assert.NotNull(baseline);
        Assert.Null(baseline.Score);
        Assert.Contains("meals", baseline.MissingData);
        Assert.Contains("eating_window", baseline.MissingData);

        var zone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh");
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, zone).DateTime);
        using (var scope = _factory.Services.CreateScope())
        {
            var owner = scope.ServiceProvider.GetRequiredService<LongevityDietDbContext>();
            foreach (var mealType in new[]
                { MealSlotType.Breakfast, MealSlotType.Lunch, MealSlotType.Dinner })
            {
                owner.MealLogs.Add(new MealLog
                {
                    UserId = userId,
                    LocalDate = today,
                    TimeZone = "Asia/Ho_Chi_Minh",
                    EatenAt = DateTimeOffset.UtcNow,
                    MealType = mealType,
                    Title = "Synthetic logged meal",
                    TotalCaloriesKcal = 350,
                });
            }
            await owner.SaveChangesAsync();
        }

        var mealOnly = await client.GetFromJsonAsync<ScoreView>("/api/v1/ldas/latest");
        Assert.NotNull(mealOnly);
        Assert.Null(mealOnly.Score);
        Assert.Equal(100m, mealOnly.Breakdown.Single(x => x.Code == "meals").RawScore);
        Assert.Contains("eating_window", mealOnly.MissingData);

        using (var scope = _factory.Services.CreateScope())
        {
            var owner = scope.ServiceProvider.GetRequiredService<LongevityDietDbContext>();
            owner.EatingWindowSnapshots.Add(new EatingWindowSnapshot
            {
                UserId = userId,
                LocalDate = today,
                TimeZone = "Asia/Ho_Chi_Minh",
                LoggedMealCount = 3,
                CaloricMealCount = 3,
                EatingWindowMinutes = 600,
                TargetWindowMinutes = 720,
                IsWithinTargetWindow = true,
                StatusCode = "WithinTarget",
            });
            await owner.SaveChangesAsync();
        }

        var complete = await client.GetFromJsonAsync<ScoreView>("/api/v1/ldas/latest");
        Assert.NotNull(complete);
        Assert.NotNull(complete.Score);
        Assert.Equal(100m, complete.CoveragePercent);
        Assert.Empty(complete.MissingData);
        Assert.Equal(100m, complete.Breakdown.Single(x => x.Code == "eating_window").RawScore);
        Assert.False(complete.IsClinical);
        Assert.Equal(complete.Score, (await client.GetFromJsonAsync<ScoreView>(
            "/api/v1/ldas/latest"))!.Score);

        using (var scope = _factory.Services.CreateScope())
        {
            var owner = scope.ServiceProvider.GetRequiredService<LongevityDietDbContext>();
            var snapshot = await owner.EatingWindowSnapshots.SingleAsync(x =>
                x.UserId == userId && x.LocalDate == today);
            snapshot.IsWithinTargetWindow = false;
            await owner.SaveChangesAsync();
        }
        var outOfTarget = await client.GetFromJsonAsync<ScoreView>("/api/v1/ldas/latest");
        Assert.NotNull(outOfTarget);
        Assert.Equal(0m, outOfTarget.Breakdown.Single(x => x.Code == "eating_window").RawScore);
        Assert.True(outOfTarget.Score < complete.Score);

        using (var scope = _factory.Services.CreateScope())
        {
            var owner = scope.ServiceProvider.GetRequiredService<LongevityDietDbContext>();
            var meals = await owner.MealLogs.Where(x => x.UserId == userId &&
                x.LocalDate == today).ToArrayAsync();
            foreach (var meal in meals) meal.IsDeleted = true;
            var window = await owner.EatingWindowSnapshots.SingleAsync(x =>
                x.UserId == userId && x.LocalDate == today);
            window.CaloricMealCount = 0;
            window.EatingWindowMinutes = null;
            await owner.SaveChangesAsync();
        }
        var deleted = await client.GetFromJsonAsync<ScoreView>("/api/v1/ldas/latest");
        Assert.NotNull(deleted);
        Assert.Null(deleted.Score);
        Assert.Contains("meals", deleted.MissingData);
        Assert.Contains("eating_window", deleted.MissingData);
    }
}
