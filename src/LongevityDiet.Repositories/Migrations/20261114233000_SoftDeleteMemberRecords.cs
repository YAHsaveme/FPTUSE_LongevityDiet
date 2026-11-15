using LongevityDiet.Repositories;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LongevityDiet.Repositories.Migrations;

/// <summary>
/// Retains member-owned planned meals, check-ins and preferences when a user
/// hides/deletes them. Existing records default to active, no data is removed.
/// Partial unique indexes allow a new meal/check-in after a soft deletion.
/// </summary>
[DbContext(typeof(LongevityDietDbContext))]
[Migration("20261114233000_SoftDeleteMemberRecords")]
public sealed class SoftDeleteMemberRecords : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        var sqlServer = ActiveProvider.Contains("SqlServer", StringComparison.OrdinalIgnoreCase);
        var boolType = sqlServer ? "bit" : "INTEGER";
        var dateType = sqlServer ? "datetimeoffset" : "TEXT";

        foreach (var table in new[] { "PlannedMeals", "WellnessCheckIns", "UserFoodPreferences" })
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted", table: table, type: boolType,
                nullable: false, defaultValue: false);
            migrationBuilder.AddColumn<DateTimeOffset?>(
                name: "DeletedAt", table: table, type: dateType, nullable: true);
        }

        migrationBuilder.DropIndex(
            name: "IX_PlannedMeals_MealPlanDayId_SlotOrder", table: "PlannedMeals");
        migrationBuilder.CreateIndex(
            name: "IX_PlannedMeals_MealPlanDayId_SlotOrder",
            table: "PlannedMeals",
            columns: new[] { "MealPlanDayId", "SlotOrder" },
            unique: true, filter: "[IsDeleted] = 0");

        migrationBuilder.DropIndex(
            name: "IX_WellnessCheckIns_UserId_LocalDate_Phase",
            table: "WellnessCheckIns");
        migrationBuilder.CreateIndex(
            name: "IX_WellnessCheckIns_UserId_LocalDate_Phase",
            table: "WellnessCheckIns",
            columns: new[] { "UserId", "LocalDate", "Phase" },
            unique: true, filter: "[IsDeleted] = 0");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // An automatic downgrade would silently re-expose archived member
        // records and discard deletion timestamps, violating retention.
        // Restore from a verified backup using an explicit data migration
        // instead of dropping history to satisfy an older schema.
        throw new NotSupportedException(
            "Automatic rollback of member soft-delete fields is disabled to protect historical data.");
    }
}
