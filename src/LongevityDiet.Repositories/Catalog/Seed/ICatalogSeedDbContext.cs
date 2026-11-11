using LongevityDiet.Domain.Catalog.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace LongevityDiet.Repositories.Catalog.Seed;

/// <summary>
/// Narrow catalog-owned seed contract, used by both the transitional legacy
/// context and the isolated CatalogDbContext without querying other domains.
/// </summary>
public interface ICatalogSeedDbContext
{
    DbSet<Food> Foods { get; }
    DbSet<Allergen> Allergens { get; }
    DbSet<Recipe> Recipes { get; }
    DbSet<DietRule> DietRules { get; }
    DbSet<RuleVersion> RuleVersions { get; }
    DbSet<RuleSetVersion> RuleSetVersions { get; }
    ChangeTracker ChangeTracker { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
