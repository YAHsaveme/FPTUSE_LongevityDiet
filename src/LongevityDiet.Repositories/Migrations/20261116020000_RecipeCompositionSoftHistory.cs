using System;
using LongevityDiet.Repositories;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable
namespace LongevityDiet.Repositories.Migrations;

/// <summary>
/// Non-destructive rollout for catalog association soft deletion and immutable
/// composition revisions. Imported snapshots preserve pre-migration state.
/// </summary>
[DbContext(typeof(LongevityDietDbContext))]
[Migration("20261116020000_RecipeCompositionSoftHistory")]
public sealed class RecipeCompositionSoftHistory : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        var sqlServer = ActiveProvider.Contains("SqlServer", StringComparison.OrdinalIgnoreCase);
        var boolType = sqlServer ? "bit" : "INTEGER";
        var dateType = sqlServer ? "datetimeoffset" : "TEXT";
        foreach (var table in new[] { "RecipeIngredients", "RecipeAllergens" })
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted", schema: "catalog", table: table,
                type: boolType, nullable: false, defaultValue: false);
            migrationBuilder.AddColumn<DateTimeOffset?>(
                name: "DeletedAt", schema: "catalog", table: table,
                type: dateType, nullable: true);
            migrationBuilder.CreateIndex(
                name: "IX_" + table + "_RecipeId_IsDeleted",
                schema: "catalog", table: table, columns: new[] { "RecipeId", "IsDeleted" });
        }

        migrationBuilder.CreateTable(
            name: "RecipeCompositionRevisions", schema: "catalog",
            columns: table => new
            {
                Id = table.Column<Guid>(type: sqlServer ? "uniqueidentifier" : "TEXT", nullable: false),
                RecipeId = table.Column<Guid>(type: sqlServer ? "uniqueidentifier" : "TEXT", nullable: false),
                RecordedAt = table.Column<DateTime>(type: sqlServer ? "datetime2" : "TEXT", nullable: false),
                ChangeType = table.Column<string>(type: sqlServer ? "nvarchar(24)" : "TEXT",
                    maxLength: 24, nullable: false),
                ActorId = table.Column<Guid>(type: sqlServer ? "uniqueidentifier" : "TEXT", nullable: true),
                SnapshotJson = table.Column<string>(type: sqlServer ? "nvarchar(max)" : "TEXT", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_RecipeCompositionRevisions", x => x.Id);
                table.ForeignKey(
                    name: "FK_RecipeCompositionRevisions_Recipes_RecipeId",
                    column: x => x.RecipeId,
                    principalSchema: "catalog",
                    principalTable: "Recipes",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "IX_RecipeCompositionRevisions_RecipeId_RecordedAt",
            schema: "catalog", table: "RecipeCompositionRevisions",
            columns: new[] { "RecipeId", "RecordedAt" });

        // Import *one* immutable baseline per pre-existing recipe rather than
        // silently treating older compositions as having no prior history.
        if (sqlServer)
            migrationBuilder.Sql(@"
INSERT INTO [catalog].[RecipeCompositionRevisions]
([Id], [RecipeId], [RecordedAt], [ChangeType], [ActorId], [SnapshotJson])
SELECT NEWID(), r.[Id], SYSUTCDATETIME(), N'Imported', NULL,
    (SELECT r.[Id] AS [recipeId], r.[IsActive] AS [isActive],
        JSON_QUERY((SELECT i.[FoodId] AS [foodId], i.[Amount] AS [amount],
                           i.[Unit] AS [unit], i.[IsOptional] AS [isOptional]
                    FROM [catalog].[RecipeIngredients] i
                    WHERE i.[RecipeId] = r.[Id] AND i.[IsDeleted] = 0
                    ORDER BY i.[FoodId] FOR JSON PATH)) AS [ingredients],
        JSON_QUERY((SELECT a.[AllergenId] AS [allergenId]
                    FROM [catalog].[RecipeAllergens] a
                    WHERE a.[RecipeId] = r.[Id] AND a.[IsDeleted] = 0
                    ORDER BY a.[AllergenId] FOR JSON PATH)) AS [allergens]
     FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
FROM [catalog].[Recipes] r;
");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Dropping revision tables and archive markers destroys original states.
        throw new NotSupportedException(
            "Unsafe rollback blocked: restore a verified SQL backup instead.");
    }
}
