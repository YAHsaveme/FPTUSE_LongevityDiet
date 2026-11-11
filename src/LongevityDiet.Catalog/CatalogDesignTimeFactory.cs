using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace LongevityDiet.Catalog;

public sealed class CatalogDesignTimeFactory : IDesignTimeDbContextFactory<CatalogDbContext>
{
    public CatalogDbContext CreateDbContext(string[] args)
    {
        var connection = Environment.GetEnvironmentVariable("ConnectionStrings__Catalog")
            ?? "Server=localhost;Database=LongevityCatalogDb;Trusted_Connection=True;TrustServerCertificate=True";
        var builder = new DbContextOptionsBuilder<CatalogDbContext>().UseSqlServer(connection);
        return new CatalogDbContext(builder.Options);
    }
}
