extern alias CatalogOwner;

using LongevityDiet.Domain.Catalog.Entities;
using LongevityDiet.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using CatalogDbContext = CatalogOwner::LongevityDiet.Catalog.CatalogDbContext;

namespace LongevityDiet.IntegrationTests;

/// <summary>
/// Reproduces the SQL Server startup model-snapshot validation without opening
/// a connection. SQLite EnsureCreated tests do not exercise migration snapshots.
/// </summary>
public sealed class RecipeMigrationSnapshotTests
{
    [Fact]
    public void BothSqlServerOwners_BuildValidMigrationSnapshotsWithoutPendingModelChanges()
    {
        const string neverConnected = "Server=localhost;Database=SnapshotOnly;User Id=sa;Password=NotUsed;TrustServerCertificate=True";
        using var legacy = new LongevityDietDbContext(
            new DbContextOptionsBuilder<LongevityDietDbContext>().UseSqlServer(neverConnected).Options);
        using var catalog = new CatalogDbContext(
            new DbContextOptionsBuilder<CatalogDbContext>().UseSqlServer(neverConnected).Options);

        AssertSnapshot(legacy);
        AssertSnapshot(catalog);
    }

    private static void AssertSnapshot(DbContext db)
    {
        var snapshot = db.GetService<IMigrationsAssembly>().ModelSnapshot;
        Assert.NotNull(snapshot);

        // The generated-style snapshot maps names to property bags; unlike
        // runtime CLR entity filters, snapshot filters must accept Dictionary.
        // This eagerly catches startup failures that SQLite EnsureCreated misses.
        var model = snapshot.Model;
        foreach (var type in new[] { typeof(RecipeIngredient), typeof(RecipeAllergen) })
        {
            var entity = model.FindEntityType(type.FullName!);
            Assert.NotNull(entity);
            Assert.Equal(typeof(Dictionary<string, object>), entity.ClrType);
            var filter = entity.GetQueryFilter();
            Assert.NotNull(filter);
            Assert.Equal(entity.ClrType, filter.Parameters[0].Type);
        }
        Assert.NotNull(model.FindEntityType(typeof(RecipeCompositionRevision).FullName!));

        // EF Core 9 checks model snapshot consistency before applying migrations.
        Assert.False(db.Database.HasPendingModelChanges(),
            "The checked-in migration snapshot must match the actual SQL Server model.");
    }
}
