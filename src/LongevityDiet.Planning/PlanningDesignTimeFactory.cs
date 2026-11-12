using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace LongevityDiet.Planning;

public sealed class PlanningDesignTimeFactory : IDesignTimeDbContextFactory<PlanningDbContext>
{
    public PlanningDbContext CreateDbContext(string[] args)
    {
        var connection = Environment.GetEnvironmentVariable("ConnectionStrings__Planning")
            ?? "Server=localhost;Database=LongevityPlanningDb;Trusted_Connection=True;TrustServerCertificate=True";
        return new PlanningDbContext(new DbContextOptionsBuilder<PlanningDbContext>()
            .UseSqlServer(connection).Options);
    }
}
