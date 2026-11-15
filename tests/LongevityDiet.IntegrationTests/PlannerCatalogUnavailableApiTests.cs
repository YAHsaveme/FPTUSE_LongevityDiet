using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using LongevityDiet.Repositories;
using LongevityDiet.Repositories.Catalog.Seed;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace LongevityDiet.IntegrationTests;

/// <summary>Strict production-style configuration on isolated in-memory SQLite, never user data.</summary>
public sealed class PlannerCatalogUnavailableApiTests : IClassFixture<IntegrationTestWebApplicationFactory>
{
    private readonly IntegrationTestWebApplicationFactory factory;
    public PlannerCatalogUnavailableApiTests(IntegrationTestWebApplicationFactory factory)
        => this.factory = factory;

    private WebApplicationFactory<Program> StrictRuntime() => factory.WithWebHostBuilder(web =>
        web.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["Planning:EnableDemoCandidates"] = "false",
                ["Planning:EnableDemoRuleSetFallback"] = "false"
            })));

    [Fact]
    public async Task MissingRuleSet_ReturnsActionable503_WithoutPersistingAPlan()
    {
        await factory.ResetDatabaseAsync();
        using var runtime = StrictRuntime();
        using var client = await CreateOnboardedClientAsync(runtime, "missing-rules");

        var response = await client.PostAsJsonAsync("/api/v1/meal-plans/generate",
            new { StartDate = (DateOnly?)null, Days = 7 });
        await AssertProblemAsync(response, "planning_rules_unavailable");

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LongevityDietDbContext>();
        Assert.Empty(await db.MealPlans.AsNoTracking().ToListAsync());
    }

    [Fact]
    public async Task NoEligibleRecipes_ReturnsActionable503_WithoutInventingDemoMeals()
    {
        await factory.ResetDatabaseAsync();
        using (var seedScope = factory.Services.CreateScope())
        {
            var db = seedScope.ServiceProvider.GetRequiredService<LongevityDietDbContext>();
            await CatalogSeed.SeedAsync(db);
            foreach (var recipe in await db.Recipes.ToListAsync())
                recipe.IsActive = false; // Synthetic test fixture only.
            await db.SaveChangesAsync();
        }

        using var runtime = StrictRuntime();
        using var client = await CreateOnboardedClientAsync(runtime, "empty-recipes");
        var response = await client.PostAsJsonAsync("/api/v1/meal-plans/generate",
            new { StartDate = (DateOnly?)null, Days = 7 });
        await AssertProblemAsync(response, "planning_catalog_empty");

        using var scope = factory.Services.CreateScope();
        var dbCheck = scope.ServiceProvider.GetRequiredService<LongevityDietDbContext>();
        Assert.Empty(await dbCheck.MealPlans.AsNoTracking().ToListAsync());
    }

    private static async Task AssertProblemAsync(HttpResponseMessage response, string code)
    {
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = document.RootElement;
        Assert.Equal(code, root.GetProperty("code").GetString());
        Assert.Equal(503, root.GetProperty("status").GetInt32());
        Assert.DoesNotContain("StackTrace", root.ToString(), StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("ConnectionStrings", root.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    private static async Task<HttpClient> CreateOnboardedClientAsync(
        WebApplicationFactory<Program> runtime, string prefix)
    {
        var client = runtime.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });
        var suffix = Guid.NewGuid().ToString("N");
        var registration = await client.PostAsJsonAsync("/api/v1/auth/register",
            new { Email = $"{prefix}-{suffix}@example.test",
                Password = "StrongPass123!", DisplayName = "QA Planner" });
        Assert.Equal(HttpStatusCode.Created, registration.StatusCode);
        using var json = JsonDocument.Parse(await registration.Content.ReadAsStringAsync());
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer", json.RootElement.GetProperty("accessToken").GetString());

        var updated = await client.PutAsJsonAsync("/api/v1/profile",
            new { DisplayName = "QA Planner", BirthYear = 1996,
                TimeZone = "Asia/Ho_Chi_Minh", WakeTime = "06:30:00",
                SleepTime = "23:00:00", PreferredMealFrequency = 3,
                FoodPreference = "Plant-forward Vietnamese" });
        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);

        var screened = await client.PutAsJsonAsync("/api/v1/wellness/screening",
            new { RiskFlags = Array.Empty<string>(), AllergiesReviewed = true,
                Allergies = Array.Empty<string>() });
        Assert.Equal(HttpStatusCode.OK, screened.StatusCode);
        return client;
    }
}
