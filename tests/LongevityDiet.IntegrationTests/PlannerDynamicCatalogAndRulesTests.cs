using LongevityDiet.Domain.Catalog.Entities;
using LongevityDiet.Repositories;
using LongevityDiet.Repositories.Repositories;
using LongevityDiet.Repositories.Catalog.Repositories;
using LongevityDiet.Repositories.Catalog.Seed;
using LongevityDiet.Services.Planning;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LongevityDiet.IntegrationTests;

public sealed class PlannerDynamicCatalogAndRulesTests : IClassFixture<IntegrationTestWebApplicationFactory>
{
    private readonly IntegrationTestWebApplicationFactory factory;

    public PlannerDynamicCatalogAndRulesTests(IntegrationTestWebApplicationFactory factory)
    {
        this.factory = factory;
    }

    [Fact]
    public async Task ProductionDefaults_OnlyUsePersistedRecipes_AndFollowPublishedRuleSet()
    {
        await factory.ResetDatabaseAsync();
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<LongevityDietDbContext>();

        // Isolated SQLite seed models Admin-curated records. No user Docker volume touched.
        await CatalogSeed.SeedAsync(db);
        var source = new PlanningCatalogSnapshotProvider(
            services.GetRequiredService<IUserRepository>(),
            services.GetRequiredService<IMealPlanRepository>(),
            services.GetRequiredService<IRecipeRepository>(),
            services.GetRequiredService<IRuleCatalogRepository>());

        var candidates = await source.GetCandidateMealsAsync();
        Assert.NotEmpty(candidates);
        Assert.All(candidates, candidate =>
        {
            Assert.StartsWith("CAT-", candidate.CandidateCode);
            Assert.DoesNotContain("demo", candidate.ContractVersion,
                StringComparison.OrdinalIgnoreCase);
        });

        var first = await source.GetActiveRuleSetAsync();
        Assert.Equal("2026.11-initial", first.RuleSetVersion);
        Assert.Equal(2, first.Rules.Count);
        Assert.Contains(first.Rules, x => x.RuleKey == "PLANT_FORWARD");
        Assert.Contains(first.Rules, x => x.RuleKey == "LOW_SUGAR_SATFAT");
        Assert.All(first.Rules, x => Assert.Equal(0m, x.BaseWeight)); // No invented numeric weights for old JSON.

        var active = await db.RuleSetVersions.Include(x => x.RuleVersions)
            .SingleAsync(x => x.IsActive);
        var previousPlant = await db.RuleVersions.Include(x => x.DietRule)
            .SingleAsync(x => x.DietRule.RuleKey == "PLANT_FORWARD_PATTERN");
        var publishedWeightedVersion = new RuleVersion
        {
            DietRuleId = previousPlant.DietRuleId,
            VersionNumber = 2,
            ParametersJson = "{\"baseWeight\":42}",
            SourceUrl = previousPlant.SourceUrl,
            SourceType = previousPlant.SourceType,
            Citation = previousPlant.Citation,
            EvidenceLevel = previousPlant.EvidenceLevel,
            State = LongevityDiet.Domain.Catalog.RuleVersionState.Published,
            EffectiveAt = DateTimeOffset.UtcNow.AddDays(-1),
            PublishedAt = DateTimeOffset.UtcNow.AddMinutes(-2),
        };
        var newSet = new RuleSetVersion
        {
            VersionLabel = "qa-new-published-set",
            IsActive = true,
            EffectiveAt = DateTimeOffset.UtcNow.AddDays(-1),
            PublishedAt = DateTimeOffset.UtcNow.AddMinutes(-2),
            RuleVersions = active.RuleVersions
                .Where(version => version.Id != previousPlant.Id)
                .Append(publishedWeightedVersion).ToList(),
        };
        active.IsActive = false;
        db.RuleSetVersions.Add(newSet);
        await db.SaveChangesAsync();

        var changed = await source.GetActiveRuleSetAsync();
        Assert.Equal("qa-new-published-set", changed.RuleSetVersion);
        Assert.NotEqual(first.RuleSetVersion, changed.RuleSetVersion);
        Assert.Contains(changed.Rules, x => x.RuleKey == "PLANT_FORWARD" && x.BaseWeight == 42m);

        newSet.IsActive = false;
        await db.SaveChangesAsync();
        var error = await Assert.ThrowsAsync<InvalidOperationException>(
            () => source.GetActiveRuleSetAsync());
        Assert.Contains("No active published RuleSet", error.Message);
    }

    [Fact]
    public async Task WithoutRepositories_RuntimeRejectsHiddenFixtures_ButTestModeOptsIn()
    {
        await factory.ResetDatabaseAsync();
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var users = services.GetRequiredService<IUserRepository>();
        var plans = services.GetRequiredService<IMealPlanRepository>();
        var runtime = new PlanningCatalogSnapshotProvider(users, plans);
        Assert.Empty(await runtime.GetCandidateMealsAsync());
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => runtime.GetActiveRuleSetAsync());

        var explicitlySynthetic = new PlanningCatalogSnapshotProvider(
            users, plans, enableTestFixtures: true);
        var demoMeals = await explicitlySynthetic.GetCandidateMealsAsync();
        Assert.NotEmpty(demoMeals);
        Assert.All(demoMeals, x => Assert.StartsWith("demo-", x.ContractVersion));
    }
}
