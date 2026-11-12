using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LongevityDiet.Repositories.Migrations
{
    /// <summary>
    /// Reconciles the EF Core model snapshots of the independently merged
    /// Identity/Reminder and Meal Planning/Recommendation/FMD branches.
    /// Every underlying table is already created by its earlier migration.
    /// This bridge must never repeat those CREATE TABLE operations.
    /// </summary>
    public partial class TeamIntegrationModelSnapshot : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Intentionally empty: prior migrations define the physical changes.
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Intentionally empty: rolling back this bridge does not drop shared data.
        }
    }
}
