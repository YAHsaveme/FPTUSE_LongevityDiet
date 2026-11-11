using LongevityDiet.Domain.Catalog.Entities;
using LongevityDiet.Repositories.Catalog.Configurations;
using LongevityDiet.Repositories.Catalog.Seed;
using Microsoft.EntityFrameworkCore;

namespace LongevityDiet.Catalog;

/// <summary>
/// Sole EF owner of LongevityCatalogDb. No Identity, Planning, Tracking,
/// Recommendation or Worker entity/DbSet belongs to this context.
/// </summary>
public sealed class CatalogDbContext(DbContextOptions<CatalogDbContext> options)
    : DbContext(options), ICatalogSeedDbContext
{
    public DbSet<Food> Foods => Set<Food>();
    public DbSet<Allergen> Allergens => Set<Allergen>();
    public DbSet<Recipe> Recipes => Set<Recipe>();
    public DbSet<RecipeIngredient> RecipeIngredients => Set<RecipeIngredient>();
    public DbSet<RecipeAllergen> RecipeAllergens => Set<RecipeAllergen>();
    public DbSet<DietRule> DietRules => Set<DietRule>();
    public DbSet<RuleVersion> RuleVersions => Set<RuleVersion>();
    public DbSet<RuleSetVersion> RuleSetVersions => Set<RuleSetVersion>();
    public DbSet<RuleAudit> RuleAudits => Set<RuleAudit>();

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        GuardHistory();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(
        bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        GuardHistory();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void GuardHistory()
    {
        ChangeTracker.DetectChanges();
        if (ChangeTracker.Entries<RuleAudit>().Any(e =>
            e.State is EntityState.Modified or EntityState.Deleted))
            throw new InvalidOperationException("Rule audit is append-only.");

        foreach (var entry in ChangeTracker.Entries<RuleVersion>())
        {
            var state = entry.OriginalValues.GetValue<LongevityDiet.Domain.Catalog.RuleVersionState>(
                nameof(RuleVersion.State));
            if (state is not (LongevityDiet.Domain.Catalog.RuleVersionState.Published
                or LongevityDiet.Domain.Catalog.RuleVersionState.Retired)) continue;

            var isRetirement = state == LongevityDiet.Domain.Catalog.RuleVersionState.Published
                && entry.Entity.State == LongevityDiet.Domain.Catalog.RuleVersionState.Retired;
            if (entry.State == EntityState.Deleted ||
                entry.State == EntityState.Modified &&
                (!isRetirement || entry.Properties.Any(p => p.IsModified &&
                    p.Metadata.Name != nameof(RuleVersion.State) &&
                    p.Metadata.Name != nameof(RuleVersion.Revision))))
                throw new InvalidOperationException("Published rule content is immutable.");
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Exactly the same entity mappings as the legacy service, but only
        // catalog configurations. No cross-domain foreign keys are introduced.
        modelBuilder.ApplyConfiguration(new FoodConfiguration());
        modelBuilder.ApplyConfiguration(new AllergenConfiguration());
        modelBuilder.ApplyConfiguration(new RecipeConfiguration());
        modelBuilder.ApplyConfiguration(new RecipeIngredientConfiguration());
        modelBuilder.ApplyConfiguration(new RecipeAllergenConfiguration());
        modelBuilder.ApplyConfiguration(new DietRuleConfiguration());
        modelBuilder.ApplyConfiguration(new RuleVersionConfiguration());
        modelBuilder.ApplyConfiguration(new RuleSetVersionConfiguration());
        modelBuilder.ApplyConfiguration(new RuleAuditConfiguration());
    }
}
