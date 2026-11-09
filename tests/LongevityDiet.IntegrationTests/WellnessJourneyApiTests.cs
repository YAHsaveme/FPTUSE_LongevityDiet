using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using LongevityDiet.API.Contracts.Planning;
using LongevityDiet.API.Contracts.Wellness;
using LongevityDiet.Services.Planning;
using LongevityDiet.Services.Wellness;

namespace LongevityDiet.IntegrationTests;

public sealed class WellnessJourneyApiTests : IClassFixture<IntegrationTestWebApplicationFactory>
{
    private readonly IntegrationTestWebApplicationFactory _factory;

    public WellnessJourneyApiTests(IntegrationTestWebApplicationFactory factory) =>
        _factory = factory;

    [Fact]
    public async Task MultiDayJourney_ReplenishesFourteenDays_AndPersistsThreeCheckInPhases()
    {
        await _factory.ResetDatabaseAsync();
        using var client = await OnboardedAsync("wellness-cycle");
        var today = LocalToday();
        var before = await client.GetFromJsonAsync<WellnessOverview>("/api/v1/wellness/overview");
        Assert.NotNull(before);
        Assert.True(before.DailyCheckInDue);
        Assert.False(before.ScreeningComplete);

        var screeningResponse = await client.PutAsJsonAsync(
            "/api/v1/wellness/screening",
            new UpdateWellnessScreeningRequest([], true, ["peanut", "shellfish"]));
        Assert.Equal(HttpStatusCode.OK, screeningResponse.StatusCode);
        var screen = await screeningResponse.Content.ReadFromJsonAsync<WellnessOverview>();
        Assert.NotNull(screen);
        Assert.True(screen.ScreeningComplete);
        Assert.Equal("AdultGeneral", screen.Segment);

        var priorRes = await client.PostAsJsonAsync("/api/v1/meal-plans/generate",
            new GenerateMealPlanRequest(today.AddDays(-4), 7));
        Assert.Equal(HttpStatusCode.Created, priorRes.StatusCode);
        var prior = await priorRes.Content.ReadFromJsonAsync<MealPlanResponse>();
        Assert.NotNull(prior);

        var replenish = await client.PostAsync("/api/v1/meal-plans/ensure-current", null);
        Assert.Equal(HttpStatusCode.OK, replenish.StatusCode);
        var rolling = await replenish.Content.ReadFromJsonAsync<MealPlanResponse>();
        Assert.NotNull(rolling);
        Assert.Equal(prior.Id, rolling.PreviousPlanId);
        Assert.Equal(14, rolling.Days.Count);
        Assert.Equal(today, rolling.StartDate);
        Assert.Equal(today.AddDays(13), rolling.EndDate);
        Assert.Equal(14, rolling.Days.Select(x => x.PlanDate).Distinct().Count());
        Assert.All(rolling.Days, d => Assert.Equal(3, d.Meals.Count));
        Assert.All(rolling.Days.SelectMany(d => d.Meals), meal =>
        {
            Assert.DoesNotContain("peanut", meal.Allergens, StringComparer.OrdinalIgnoreCase);
            Assert.DoesNotContain("shellfish", meal.Allergens, StringComparer.OrdinalIgnoreCase);
        });

        var repeated = await client.PostAsync("/api/v1/meal-plans/ensure-current", null);
        Assert.Equal(HttpStatusCode.OK, repeated.StatusCode);
        var repeatedPlan = await repeated.Content.ReadFromJsonAsync<MealPlanResponse>();
        Assert.Equal(rolling.Id, repeatedPlan!.Id);

        foreach (var phase in new[] { "Baseline", "During", "FollowUp" })
        {
            var save = await client.PostAsJsonAsync("/api/v1/wellness/check-ins",
                new SaveWellnessCheckInRequest(
                    today, phase, 4, 3, 5, 4, ["fatigue"], ["better_sleep"], null, "Self-reported"));
            Assert.Equal(HttpStatusCode.OK, save.StatusCode);
        }

        var after = await client.GetFromJsonAsync<WellnessOverview>("/api/v1/wellness/overview");
        Assert.NotNull(after);
        Assert.False(after.DailyCheckInDue);
        Assert.Equal(3, after.RecentCheckIns.Count);
        Assert.Equal(3, after.RecentCheckIns.Select(x => x.Phase).Distinct().Count());

        var originalDuring = after.RecentCheckIns.Single(x => x.Phase == "During");
        var update = await client.PostAsJsonAsync("/api/v1/wellness/check-ins",
            new SaveWellnessCheckInRequest(today, "During", 5, 5, 5, 5, [], [], 65.5m, "Updated"));
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        var updated = await client.GetFromJsonAsync<WellnessOverview>("/api/v1/wellness/overview");
        var newDuring = updated!.RecentCheckIns.Single(x => x.Phase == "During");
        Assert.Equal(originalDuring.Id, newDuring.Id);
        Assert.Equal(5, newDuring.Energy);
        Assert.Equal(65.5m, newDuring.WeightKg);
        Assert.Equal(3, updated.RecentCheckIns.Count);
        Assert.Equal(1, updated.Trend.DaysReported);
        Assert.Equal(1, updated.Trend.DaysDuring);
        Assert.Equal(5m, updated.Trend.AverageEnergyDuring);
        Assert.Equal(4, updated.Trend.BaselineEnergy);
        Assert.Equal(1m, updated.Trend.EnergyChangeFromBaseline);
    }

    [Fact]
    public async Task ProfessionalReview_RiskAndUrgentSymptoms_BlockAutonomousPlan()
    {
        await _factory.ResetDatabaseAsync();
        using var client = await OnboardedAsync("wellness-safety");

        var screen = await client.PutAsJsonAsync("/api/v1/wellness/screening",
            new UpdateWellnessScreeningRequest(["kidney_disease"], true, []));
        Assert.Equal(HttpStatusCode.OK, screen.StatusCode);
        var overview = await screen.Content.ReadFromJsonAsync<WellnessOverview>();
        Assert.True(overview!.RequiresProfessionalReview);
        Assert.Equal("ProfessionalReviewRequired", overview.Segment);

        var plan = await client.PostAsync("/api/v1/meal-plans/ensure-current", null);
        Assert.Equal(HttpStatusCode.BadRequest, plan.StatusCode);
        var legacyPlan = await client.PostAsJsonAsync("/api/v1/meal-plans/generate",
            new GenerateMealPlanRequest(LocalToday(), 7));
        Assert.Equal(HttpStatusCode.BadRequest, legacyPlan.StatusCode);

        var clear = await client.PutAsJsonAsync("/api/v1/wellness/screening",
            new UpdateWellnessScreeningRequest([], true, []));
        Assert.Equal(HttpStatusCode.OK, clear.StatusCode);

        var urgent = await client.PostAsJsonAsync("/api/v1/wellness/check-ins",
            new SaveWellnessCheckInRequest(
                LocalToday(), "During", 2, 1, 2, 1,
                ["breathing_difficulty"], ["less_energy"], null, null));
        Assert.Equal(HttpStatusCode.OK, urgent.StatusCode);
        var urgentView = await client.GetFromJsonAsync<WellnessOverview>("/api/v1/wellness/overview");
        Assert.True(urgentView!.UrgentHelpRecommended);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.PostAsync("/api/v1/meal-plans/ensure-current", null)).StatusCode);
    }

    [Fact]
    public async Task AllergyChange_RequiresRescreening_AndInvalidInputDoesNotPersist()
    {
        await _factory.ResetDatabaseAsync();
        using var client = await OnboardedAsync("wellness-allergy");

        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.PostAsync("/api/v1/meal-plans/ensure-current", null)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.PutAsJsonAsync("/api/v1/wellness/screening",
                new UpdateWellnessScreeningRequest(["invented_diagnosis"], true, []))).StatusCode);

        var screen = await client.PutAsJsonAsync("/api/v1/wellness/screening",
            new UpdateWellnessScreeningRequest([], true, ["peanut"]));
        Assert.Equal(HttpStatusCode.OK, screen.StatusCode);

        var preference = await client.PutAsJsonAsync("/api/v1/meal-plans/preferences",
            new UpdateDietaryPreferenceRequest("PlantForward", ["peanut", "shellfish"], [], null));
        Assert.Equal(HttpStatusCode.OK, preference.StatusCode);
        var overview = await client.GetFromJsonAsync<WellnessOverview>("/api/v1/wellness/overview");
        Assert.False(overview!.ScreeningComplete);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.PostAsync("/api/v1/meal-plans/ensure-current", null)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.PostAsJsonAsync("/api/v1/meal-plans/generate",
                new GenerateMealPlanRequest(LocalToday(), 7))).StatusCode);

        var reReview = await client.PutAsJsonAsync("/api/v1/wellness/screening",
            new UpdateWellnessScreeningRequest([], true, ["peanut", "shellfish"]));
        Assert.Equal(HttpStatusCode.OK, reReview.StatusCode);
        Assert.Equal(HttpStatusCode.OK,
            (await client.PostAsync("/api/v1/meal-plans/ensure-current", null)).StatusCode);

        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.PostAsJsonAsync("/api/v1/wellness/check-ins",
                new SaveWellnessCheckInRequest(
                    LocalToday(), "During", 0, 5, 5, 5, [], [], null, null))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.PostAsJsonAsync("/api/v1/wellness/check-ins",
                new SaveWellnessCheckInRequest(
                    LocalToday().AddDays(1), "During", 3, 3, 3, 3, [], [], null, null))).StatusCode);
    }

    [Fact]
    public async Task WellnessPrivacy_RequiresJwt_AndRejectsOtherUserCheckInDeletion()
    {
        await _factory.ResetDatabaseAsync();
        using var owner = await OnboardedAsync("wellness-owner");
        using var stranger = await OnboardedAsync("wellness-stranger");
        using var anonymous = _factory.CreateHttpsClient();

        Assert.Equal(HttpStatusCode.Unauthorized,
            (await anonymous.GetAsync("/api/v1/wellness/overview")).StatusCode);
        var create = await owner.PostAsJsonAsync("/api/v1/wellness/check-ins",
            new SaveWellnessCheckInRequest(LocalToday(), "During", 3, 3, 3, 3, [], [], null, null));
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);
        var result = await owner.GetFromJsonAsync<WellnessOverview>("/api/v1/wellness/overview");
        var id = Assert.Single(result!.RecentCheckIns).Id;

        Assert.Empty((await stranger.GetFromJsonAsync<WellnessOverview>("/api/v1/wellness/overview"))!.RecentCheckIns);
        Assert.Equal(HttpStatusCode.NotFound,
            (await stranger.DeleteAsync("/api/v1/wellness/check-ins/" + id)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent,
            (await owner.DeleteAsync("/api/v1/wellness/check-ins/" + id)).StatusCode);
        Assert.Empty((await owner.GetFromJsonAsync<WellnessOverview>("/api/v1/wellness/overview"))!.RecentCheckIns);
    }

    [Fact]
    public async Task VietnameseAllergyNames_AreExcludedThroughoutAllFourteenDays()
    {
        await _factory.ResetDatabaseAsync();
        using var client = await OnboardedAsync("vietnamese-allergy");
        var screening = await client.PutAsJsonAsync("/api/v1/wellness/screening",
            new UpdateWellnessScreeningRequest([], true, ["đậu phộng", "tôm", "hạt óc chó"]));
        Assert.Equal(HttpStatusCode.OK, screening.StatusCode);
        var response = await client.PostAsync("/api/v1/meal-plans/ensure-current", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var plan = await response.Content.ReadFromJsonAsync<MealPlanResponse>();
        Assert.NotNull(plan);
        Assert.Equal(14, plan.Days.Count);
        foreach (var meal in plan.Days.SelectMany(x => x.Meals))
        {
            Assert.DoesNotContain("peanut", meal.Allergens, StringComparer.OrdinalIgnoreCase);
            Assert.DoesNotContain("shellfish", meal.Allergens, StringComparer.OrdinalIgnoreCase);
            Assert.DoesNotContain("walnut", meal.Allergens, StringComparer.OrdinalIgnoreCase);
            Assert.DoesNotContain("tree-nut", meal.Allergens, StringComparer.OrdinalIgnoreCase);
        }
    }

    [Fact]
    public async Task UpdatingAllergy_ImmediatelyInvalidatesCurrentPlan_AndBuildsSafeReplacement()
    {
        await _factory.ResetDatabaseAsync();
        using var client = await OnboardedAsync("allergy-change");
        Assert.Equal(HttpStatusCode.OK,
            (await client.PutAsJsonAsync("/api/v1/wellness/screening",
                new UpdateWellnessScreeningRequest([], true, []))).StatusCode);
        var first = await client.PostAsync("/api/v1/meal-plans/ensure-current", null);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var previous = await first.Content.ReadFromJsonAsync<MealPlanResponse>();

        Assert.Equal(HttpStatusCode.OK,
            (await client.PutAsJsonAsync("/api/v1/wellness/screening",
                new UpdateWellnessScreeningRequest([], true, ["peanut", "shellfish"]))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.GetAsync("/api/v1/meal-plans/current")).StatusCode);
        var renewed = await client.PostAsync("/api/v1/meal-plans/ensure-current", null);
        Assert.Equal(HttpStatusCode.OK, renewed.StatusCode);
        var replacement = await renewed.Content.ReadFromJsonAsync<MealPlanResponse>();
        Assert.NotNull(replacement);
        Assert.NotEqual(previous!.Id, replacement.Id);
        Assert.Equal(previous.Id, replacement.PreviousPlanId);
        Assert.Equal(14, replacement.Days.Count);
        Assert.All(replacement.Days.SelectMany(x => x.Meals), meal =>
        {
            Assert.DoesNotContain("peanut", meal.Allergens, StringComparer.OrdinalIgnoreCase);
            Assert.DoesNotContain("shellfish", meal.Allergens, StringComparer.OrdinalIgnoreCase);
        });
    }

    [Fact]
    public async Task UnverifiedAge_BlocksUnsupervisedRollingPlan()
    {
        await _factory.ResetDatabaseAsync();
        using var client = _factory.CreateHttpsClient();
        var register = await client.PostAsJsonAsync("/api/v1/auth/register",
            new { Email = "age-check-" + Guid.NewGuid().ToString("N") + "@example.test",
                Password = "StrongPass123!", DisplayName = "AgeUnverified" });
        Assert.Equal(HttpStatusCode.Created, register.StatusCode);
        var tokens = await register.Content.ReadFromJsonAsync<AuthTokens>();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", tokens!.AccessToken);
        var screen = await client.PutAsJsonAsync("/api/v1/wellness/screening",
            new UpdateWellnessScreeningRequest([], true, []));
        Assert.Equal(HttpStatusCode.OK, screen.StatusCode);
        var overview = await client.GetFromJsonAsync<WellnessOverview>("/api/v1/wellness/overview");
        Assert.True(overview!.RequiresProfessionalReview);
        Assert.Equal("AgeUnverified", overview.Segment);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.PostAsync("/api/v1/meal-plans/ensure-current", null)).StatusCode);
    }

    [Fact]
    public async Task RepeatedVeryLowWellbeing_RequiresReviewAndStopsRollingPlans()
    {
        await _factory.ResetDatabaseAsync();
        using var client = await OnboardedAsync("wellbeing-review");
        var screening = await client.PutAsJsonAsync("/api/v1/wellness/screening",
            new UpdateWellnessScreeningRequest([], true, []));
        Assert.Equal(HttpStatusCode.OK, screening.StatusCode);
        var today = LocalToday();

        foreach (var day in new[] { today.AddDays(-2), today.AddDays(-1) })
        {
            var save = await client.PostAsJsonAsync("/api/v1/wellness/check-ins",
                new SaveWellnessCheckInRequest(
                    day, "During", 1, 1, 2, 3, ["fatigue"], ["less_energy"], null, null));
            Assert.Equal(HttpStatusCode.OK, save.StatusCode);
        }

        var overview = await client.GetFromJsonAsync<WellnessOverview>("/api/v1/wellness/overview");
        Assert.NotNull(overview);
        Assert.True(overview.RequiresProfessionalReview);
        Assert.True(overview.Trend.RepeatedLowWellbeing);
        Assert.Equal("WellbeingReviewRequired", overview.Segment);

        var response = await client.PostAsync("/api/v1/meal-plans/ensure-current", null);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task SafetyGate_RejectsManualBypassAndUnknownAllergenBeforeAnyPlan()
    {
        await _factory.ResetDatabaseAsync();
        using var client = await OnboardedAsync("manual-safety");
        var today = LocalToday();

        // Manual generation must not bypass the daily rolling-plan screening.
        var unscreened = await client.PostAsJsonAsync("/api/v1/meal-plans/generate",
            new GenerateMealPlanRequest(today, 7));
        Assert.Equal(HttpStatusCode.BadRequest, unscreened.StatusCode);

        // Unknown allergy terms fail closed; a non-match does not mean safety.
        var reviewedUnknown = await client.PutAsJsonAsync("/api/v1/wellness/screening",
            new UpdateWellnessScreeningRequest([], true, ["unrecognized wild herb"]));
        Assert.Equal(HttpStatusCode.OK, reviewedUnknown.StatusCode);
        var unsupported = await client.PostAsJsonAsync("/api/v1/meal-plans/generate",
            new GenerateMealPlanRequest(today, 7));
        Assert.Equal(HttpStatusCode.BadRequest, unsupported.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.PostAsync("/api/v1/meal-plans/ensure-current", null)).StatusCode);

        // A newly typed allergy in a manual request requires confirmation
        // in the screening; it cannot silently overwrite reviewed allergies.
        var reviewed = await client.PutAsJsonAsync("/api/v1/wellness/screening",
            new UpdateWellnessScreeningRequest([], true, ["peanut"]));
        Assert.Equal(HttpStatusCode.OK, reviewed.StatusCode);
        var unreviewedAddition = await client.PostAsJsonAsync("/api/v1/meal-plans/generate",
            new GenerateMealPlanRequest(today, 7, Allergies: ["shellfish"]));
        Assert.Equal(HttpStatusCode.BadRequest, unreviewedAddition.StatusCode);
        var overview = await client.GetFromJsonAsync<WellnessOverview>("/api/v1/wellness/overview");
        Assert.Equal("peanut", Assert.Single(overview!.Allergies));

        var reviewedBoth = await client.PutAsJsonAsync("/api/v1/wellness/screening",
            new UpdateWellnessScreeningRequest([], true, ["peanut", "shellfish"]));
        Assert.Equal(HttpStatusCode.OK, reviewedBoth.StatusCode);
        var allowed = await client.PostAsJsonAsync("/api/v1/meal-plans/generate",
            new GenerateMealPlanRequest(today, 7));
        Assert.Equal(HttpStatusCode.Created, allowed.StatusCode);
    }

    private static DateOnly LocalToday() =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(
            DateTimeOffset.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh")).DateTime);

    private async Task<HttpClient> OnboardedAsync(string prefix)
    {
        var client = _factory.CreateHttpsClient();
        var register = await client.PostAsJsonAsync("/api/v1/auth/register",
            new { Email = prefix + "-" + Guid.NewGuid().ToString("N") + "@example.test",
                Password = "StrongPass123!", DisplayName = prefix });
        Assert.Equal(HttpStatusCode.Created, register.StatusCode);
        var tokens = await register.Content.ReadFromJsonAsync<AuthTokens>();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", tokens!.AccessToken);
        var profile = await client.PutAsJsonAsync("/api/v1/profile",
            new { DisplayName = prefix, BirthYear = 1996,
                TimeZone = "Asia/Ho_Chi_Minh",
                WakeTime = "06:30:00", SleepTime = "23:00:00",
                PreferredMealFrequency = 3, FoodPreference = "Plant-forward Vietnamese" });
        Assert.Equal(HttpStatusCode.OK, profile.StatusCode);
        return client;
    }

    private sealed record AuthTokens(string AccessToken);
}
