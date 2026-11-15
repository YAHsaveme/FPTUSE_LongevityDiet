using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LongevityDiet.Recommendation.Grpc.Ownership.Migrations;

/// <summary>
/// Keep member food-preference history in the ADR-005 Recommendation owner's
/// own SQL database. Reuse the existing unique (UserId, FoodToken) record
/// after deletion rather than creating duplicate preference revisions.
/// </summary>
[DbContext(typeof(RecommendationDbContext))]
[Migration("20261115003000_SoftDeleteOwnedFoodPreferences")]
public sealed class SoftDeleteOwnedFoodPreferences : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "IsDeleted",
            table: "UserFoodPreferences",
            type: "bit",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<DateTimeOffset>(
            name: "DeletedAt",
            table: "UserFoodPreferences",
            type: "datetimeoffset",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Dropping these fields would permanently destroy members' soft-delete
        // history. Any rollback must be an independently audited data migration.
        throw new NotSupportedException(
            "Automatic rollback of owned food-preference soft deletion is disabled.");
    }
}
