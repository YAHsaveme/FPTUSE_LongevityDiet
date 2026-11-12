using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LongevityDiet.Recommendation.Grpc.Ownership.Migrations
{
    /// <inheritdoc />
    public partial class InitialRecommendationOwner : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RecommendationFeedbacks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CandidateCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    CandidateTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PlannedMealId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    FeedbackType = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    ReasonCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(600)", maxLength: 600, nullable: true),
                    RuleSetVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    WeightProfileVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecommendationFeedbacks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RecommendationInbox",
                columns: table => new
                {
                    EventId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EventType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ProcessedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecommendationInbox", x => x.EventId);
                });

            migrationBuilder.CreateTable(
                name: "RecommendationOutbox",
                columns: table => new
                {
                    EventId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EventType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PayloadJson = table.Column<string>(type: "nvarchar(max)", maxLength: 4096, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PublishedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PublishAttempts = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecommendationOutbox", x => x.EventId);
                });

            migrationBuilder.CreateTable(
                name: "UserFoodPreferences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FoodToken = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    DisplayLabel = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PreferenceKind = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Source = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserFoodPreferences", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RecommendationFeedbacks_UserId_CandidateCode_CreatedAt",
                table: "RecommendationFeedbacks",
                columns: new[] { "UserId", "CandidateCode", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_RecommendationInbox_ProcessedAtUtc",
                table: "RecommendationInbox",
                column: "ProcessedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_RecommendationOutbox_PublishedAtUtc_CreatedAtUtc",
                table: "RecommendationOutbox",
                columns: new[] { "PublishedAtUtc", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_UserFoodPreferences_UserId_FoodToken",
                table: "UserFoodPreferences",
                columns: new[] { "UserId", "FoodToken" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RecommendationFeedbacks");

            migrationBuilder.DropTable(
                name: "RecommendationInbox");

            migrationBuilder.DropTable(
                name: "RecommendationOutbox");

            migrationBuilder.DropTable(
                name: "UserFoodPreferences");
        }
    }
}
