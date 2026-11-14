using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LongevityDiet.Planning.Migrations;

/// <summary>
/// Mirror PlannedMeal soft-delete columns in ADR-005's isolated Planning SQL
/// database. These are independent migrations, not a cross-DB schema update.
/// </summary>
[DbContext(typeof(PlanningDbContext))]
[Migration("20261114235500_SoftDeleteOwnedPlannedMeals")]
public sealed class SoftDeleteOwnedPlannedMeals : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "IsDeleted",
            table: "PlannedMeals",
            type: "bit",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<DateTimeOffset>(
            name: "DeletedAt",
            table: "PlannedMeals",
            type: "datetimeoffset",
            nullable: true);

        migrationBuilder.DropIndex(
            name: "IX_PlannedMeals_MealPlanDayId_SlotOrder",
            table: "PlannedMeals");

        migrationBuilder.CreateIndex(
            name: "IX_PlannedMeals_MealPlanDayId_SlotOrder",
            table: "PlannedMeals",
            columns: new[] { "MealPlanDayId", "SlotOrder" },
            unique: true,
            filter: "[IsDeleted] = 0");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // A downgrade after deletions exist would destroy retained history or
        // reintroduce unique-index conflicts. Require audited DB restoration.
        throw new NotSupportedException(
            "Automatic rollback of owned Planning soft deletes is disabled to preserve history.");
    }
}
