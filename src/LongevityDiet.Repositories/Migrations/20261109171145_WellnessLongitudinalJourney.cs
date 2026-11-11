using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LongevityDiet.Repositories.Migrations
{
    /// <inheritdoc />
    public partial class WellnessLongitudinalJourney : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WellnessCheckIns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LocalDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Phase = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Energy = table.Column<int>(type: "int", nullable: false),
                    Mood = table.Column<int>(type: "int", nullable: false),
                    Digestion = table.Column<int>(type: "int", nullable: false),
                    SleepQuality = table.Column<int>(type: "int", nullable: false),
                    SymptomsCsv = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    BodyChangesCsv = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    WeightKg = table.Column<decimal>(type: "decimal(6,2)", precision: 6, scale: 2, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    RecordedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WellnessCheckIns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WellnessCheckIns_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WellnessScreenings",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RiskFlagsCsv = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    AllergiesReviewed = table.Column<bool>(type: "bit", nullable: false),
                    ReviewedAllergiesCsv = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    ReviewedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WellnessScreenings", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_WellnessScreenings_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WellnessCheckIns_UserId_LocalDate_Phase",
                table: "WellnessCheckIns",
                columns: new[] { "UserId", "LocalDate", "Phase" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WellnessCheckIns");

            migrationBuilder.DropTable(
                name: "WellnessScreenings");
        }
    }
}
