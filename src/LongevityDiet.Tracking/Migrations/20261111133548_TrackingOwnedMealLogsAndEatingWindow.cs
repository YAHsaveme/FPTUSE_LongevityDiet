using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LongevityDiet.Tracking.Migrations
{
    /// <inheritdoc />
    public partial class TrackingOwnedMealLogsAndEatingWindow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EatingWindowSnapshots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LocalDate = table.Column<DateOnly>(type: "date", nullable: false),
                    TimeZone = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LoggedMealCount = table.Column<int>(type: "int", nullable: false),
                    CaloricMealCount = table.Column<int>(type: "int", nullable: false),
                    TotalCaloriesKcal = table.Column<int>(type: "int", nullable: false),
                    FirstMealAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastMealAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    FirstMealLocalTime = table.Column<TimeOnly>(type: "time", nullable: true),
                    LastMealLocalTime = table.Column<TimeOnly>(type: "time", nullable: true),
                    EatingWindowMinutes = table.Column<int>(type: "int", nullable: true),
                    TargetWindowMinutes = table.Column<int>(type: "int", nullable: false),
                    IsWithinTargetWindow = table.Column<bool>(type: "bit", nullable: false),
                    ConfiguredSleepTime = table.Column<TimeOnly>(type: "time", nullable: true),
                    MinutesBeforeBedtime = table.Column<int>(type: "int", nullable: true),
                    IsLateEatingFlagged = table.Column<bool>(type: "bit", nullable: false),
                    StatusCode = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    SummaryMessage = table.Column<string>(type: "nvarchar(600)", maxLength: 600, nullable: false),
                    CalculatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EatingWindowSnapshots", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MealLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PlannedMealId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    EatenAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    LocalDate = table.Column<DateOnly>(type: "date", nullable: false),
                    TimeZone = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    MealType = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    TotalCaloriesKcal = table.Column<int>(type: "int", nullable: false),
                    TotalProteinGrams = table.Column<decimal>(type: "decimal(8,2)", precision: 8, scale: 2, nullable: false),
                    TotalCarbsGrams = table.Column<decimal>(type: "decimal(8,2)", precision: 8, scale: 2, nullable: false),
                    TotalFatGrams = table.Column<decimal>(type: "decimal(8,2)", precision: 8, scale: 2, nullable: false),
                    TotalFiberGrams = table.Column<decimal>(type: "decimal(8,2)", precision: 8, scale: 2, nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MealLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MealLogItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MealLogId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FoodCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    FoodName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ServingAmount = table.Column<decimal>(type: "decimal(8,2)", precision: 8, scale: 2, nullable: false),
                    ServingUnit = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    CaloriesKcal = table.Column<int>(type: "int", nullable: false),
                    ProteinGrams = table.Column<decimal>(type: "decimal(8,2)", precision: 8, scale: 2, nullable: false),
                    CarbsGrams = table.Column<decimal>(type: "decimal(8,2)", precision: 8, scale: 2, nullable: false),
                    FatGrams = table.Column<decimal>(type: "decimal(8,2)", precision: 8, scale: 2, nullable: false),
                    FiberGrams = table.Column<decimal>(type: "decimal(8,2)", precision: 8, scale: 2, nullable: false),
                    IsPlantBased = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MealLogItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MealLogItems_MealLogs_MealLogId",
                        column: x => x.MealLogId,
                        principalTable: "MealLogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EatingWindowSnapshots_UserId_LocalDate",
                table: "EatingWindowSnapshots",
                columns: new[] { "UserId", "LocalDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MealLogItems_MealLogId",
                table: "MealLogItems",
                column: "MealLogId");

            migrationBuilder.CreateIndex(
                name: "IX_MealLogs_UserId_EatenAt",
                table: "MealLogs",
                columns: new[] { "UserId", "EatenAt" });

            migrationBuilder.CreateIndex(
                name: "IX_MealLogs_UserId_LocalDate_IsDeleted",
                table: "MealLogs",
                columns: new[] { "UserId", "LocalDate", "IsDeleted" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EatingWindowSnapshots");

            migrationBuilder.DropTable(
                name: "MealLogItems");

            migrationBuilder.DropTable(
                name: "MealLogs");
        }
    }
}
