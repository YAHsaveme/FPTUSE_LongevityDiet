using LongevityDiet.Identity;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LongevityDiet.Identity.Migrations;

/// <summary>
/// Non-destructive Identity owner rollout for bearer-token invalidation.
/// Old rows have version 0; disabling an account increments the version.
/// </summary>
[DbContext(typeof(IdentityDbContext))]
[Migration("20261116150000_IdentitySessionVersion")]
public sealed class IdentitySessionVersion : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        var sqlServer = ActiveProvider.Contains("SqlServer", StringComparison.OrdinalIgnoreCase);
        migrationBuilder.AddColumn<int>(
            name: "SessionVersion",
            table: "Users",
            type: sqlServer ? "int" : "INTEGER",
            nullable: false,
            defaultValue: 0);
    }

    protected override void Down(MigrationBuilder migrationBuilder) =>
        throw new NotSupportedException(
            "Destructive rollback of account session version is blocked.");
}
