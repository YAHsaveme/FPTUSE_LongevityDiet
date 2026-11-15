using System.Text.Json;
using LongevityDiet.Repositories;
using LongevityDiet.Repositories.Catalog.Seed;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LongevityDiet.IntegrationTests;

public sealed class CatalogRecipeSeedHistoryTests : IClassFixture<IntegrationTestWebApplicationFactory>
{
    private readonly IntegrationTestWebApplicationFactory _factory;

    public CatalogRecipeSeedHistoryTests(IntegrationTestWebApplicationFactory factory) =>
        _factory = factory;

    [Fact]
    public async Task NewSeededRecipes_CreateOneImmutableBaselineAndRemainIdempotent()
    {
        await _factory.ResetDatabaseAsync();
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<LongevityDietDbContext>();

        await CatalogSeed.SeedAsync(db);
        var seededRecipes = await db.Recipes.AsNoTracking().ToListAsync();
        Assert.Equal(2, seededRecipes.Count);

        var revisions = await db.RecipeCompositionRevisions.AsNoTracking().ToListAsync();
        Assert.Equal(2, revisions.Count);
        foreach (var recipe in seededRecipes)
        {
            var baseline = Assert.Single(revisions, r => r.RecipeId == recipe.Id);
            Assert.Equal("Seeded", baseline.ChangeType);
            Assert.Null(baseline.ActorId);
            using var json = JsonDocument.Parse(baseline.SnapshotJson);
            Assert.True(json.RootElement.GetProperty("isActive").GetBoolean());
            Assert.NotEmpty(json.RootElement.GetProperty("ingredients").EnumerateArray());
        }

        await CatalogSeed.SeedAsync(db);
        Assert.Equal(2, await db.RecipeCompositionRevisions.CountAsync());
        Assert.Equal(2, await db.Recipes.CountAsync());
    }
}
