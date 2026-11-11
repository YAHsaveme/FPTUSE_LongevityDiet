using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LongevityDiet.Planning.Migrations
{
    /// <inheritdoc />
    public partial class InitialPlanningOwner : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ChallengeTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    DurationDays = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChallengeTemplates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FmdCycles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CycleNumber = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    TargetDays = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    StartedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CompletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    StoppedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    StopReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FmdCycles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FmdEducationAcknowledgements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EducationVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    AcknowledgedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    SourceCitation = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    DisclaimerAccepted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FmdEducationAcknowledgements", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FmdSafetyAssessments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssessmentVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    EvaluatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ResultStatus = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    HasHighRiskFlag = table.Column<bool>(type: "bit", nullable: false),
                    TriggeredRiskCodesCsv = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    RecommendationsSummary = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    AnswersJson = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(600)", maxLength: 600, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FmdSafetyAssessments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MealPlans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RuleSetVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    RevisionNumber = table.Column<int>(type: "int", nullable: false),
                    PreviousPlanId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    MealsPerDay = table.Column<int>(type: "int", nullable: false),
                    TimeZone = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DietaryPattern = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    AppliedAllergiesCsv = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    AppliedExclusionsCsv = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    ReasonCodesCsv = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    PlanExplanation = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    GeneratedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MealPlans", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PlanningOutbox",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EventType = table.Column<string>(type: "nvarchar(96)", maxLength: 96, nullable: false),
                    PayloadJson = table.Column<string>(type: "nvarchar(max)", maxLength: 4096, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PublishedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PublishAttempts = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlanningOutbox", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserDietaryPreferences",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DietaryPattern = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    AllergiesCsv = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    ExcludedFoodsCsv = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    PreferredCuisine = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserDietaryPreferences", x => x.UserId);
                });

            migrationBuilder.CreateTable(
                name: "ChallengeDayTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ChallengeTemplateId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DayNumber = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Guidance = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChallengeDayTemplates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChallengeDayTemplates_ChallengeTemplates_ChallengeTemplateId",
                        column: x => x.ChallengeTemplateId,
                        principalTable: "ChallengeTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserChallenges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ChallengeTemplateId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TimeZone = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    StartedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CompletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserChallenges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserChallenges_ChallengeTemplates_ChallengeTemplateId",
                        column: x => x.ChallengeTemplateId,
                        principalTable: "ChallengeTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "FmdCycleDays",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FmdCycleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DayNumber = table.Column<int>(type: "int", nullable: false),
                    PlanDate = table.Column<DateOnly>(type: "date", nullable: false),
                    TargetCaloriesKcal = table.Column<int>(type: "int", nullable: false),
                    EnergyLevel = table.Column<int>(type: "int", nullable: true),
                    HungerLevel = table.Column<int>(type: "int", nullable: true),
                    WaterIntakeLiters = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    Symptoms = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    DailyNotes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    IsCompleted = table.Column<bool>(type: "bit", nullable: false),
                    LoggedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FmdCycleDays", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FmdCycleDays_FmdCycles_FmdCycleId",
                        column: x => x.FmdCycleId,
                        principalTable: "FmdCycles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MealPlanDays",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MealPlanId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DayNumber = table.Column<int>(type: "int", nullable: false),
                    PlanDate = table.Column<DateOnly>(type: "date", nullable: false),
                    TargetCaloriesKcal = table.Column<int>(type: "int", nullable: false),
                    DailyFocusCode = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    DailyFocusTitle = table.Column<string>(type: "nvarchar(240)", maxLength: 240, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MealPlanDays", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MealPlanDays_MealPlans_MealPlanId",
                        column: x => x.MealPlanId,
                        principalTable: "MealPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserChallengeDays",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserChallengeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DayNumber = table.Column<int>(type: "int", nullable: false),
                    LocalDate = table.Column<DateOnly>(type: "date", nullable: false),
                    IsCompleted = table.Column<bool>(type: "bit", nullable: false),
                    CompletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserChallengeDays", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserChallengeDays_UserChallenges_UserChallengeId",
                        column: x => x.UserChallengeId,
                        principalTable: "UserChallenges",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PlannedMeals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MealPlanDayId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MealPlanId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SlotOrder = table.Column<int>(type: "int", nullable: false),
                    SlotType = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    PlannedTime = table.Column<TimeOnly>(type: "time", nullable: false),
                    CandidateCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(600)", maxLength: 600, nullable: false),
                    Cuisine = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    ServingSize = table.Column<decimal>(type: "decimal(8,2)", precision: 8, scale: 2, nullable: false),
                    ServingUnit = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    CaloriesKcal = table.Column<int>(type: "int", nullable: false),
                    ProteinGrams = table.Column<decimal>(type: "decimal(8,2)", precision: 8, scale: 2, nullable: false),
                    CarbsGrams = table.Column<decimal>(type: "decimal(8,2)", precision: 8, scale: 2, nullable: false),
                    FatGrams = table.Column<decimal>(type: "decimal(8,2)", precision: 8, scale: 2, nullable: false),
                    FiberGrams = table.Column<decimal>(type: "decimal(8,2)", precision: 8, scale: 2, nullable: false),
                    IsPlantBased = table.Column<bool>(type: "bit", nullable: false),
                    HasLegumes = table.Column<bool>(type: "bit", nullable: false),
                    HasWholeGrains = table.Column<bool>(type: "bit", nullable: false),
                    ContainsFish = table.Column<bool>(type: "bit", nullable: false),
                    AllergensCsv = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    IngredientsCsv = table.Column<string>(type: "nvarchar(800)", maxLength: 800, nullable: false),
                    DeterministicScore = table.Column<decimal>(type: "decimal(8,2)", precision: 8, scale: 2, nullable: false),
                    ReasonCodesCsv = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ExplanationSummary = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    RegenerationCount = table.Column<int>(type: "int", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlannedMeals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PlannedMeals_MealPlanDays_MealPlanDayId",
                        column: x => x.MealPlanDayId,
                        principalTable: "MealPlanDays",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ChallengeDayTemplates_ChallengeTemplateId_DayNumber",
                table: "ChallengeDayTemplates",
                columns: new[] { "ChallengeTemplateId", "DayNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ChallengeTemplates_Code",
                table: "ChallengeTemplates",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FmdCycleDays_FmdCycleId_DayNumber",
                table: "FmdCycleDays",
                columns: new[] { "FmdCycleId", "DayNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FmdCycles_UserId_Status",
                table: "FmdCycles",
                columns: new[] { "UserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_FmdEducationAcknowledgements_UserId_EducationVersion",
                table: "FmdEducationAcknowledgements",
                columns: new[] { "UserId", "EducationVersion" });

            migrationBuilder.CreateIndex(
                name: "IX_FmdSafetyAssessments_UserId_EvaluatedAt",
                table: "FmdSafetyAssessments",
                columns: new[] { "UserId", "EvaluatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_MealPlanDays_MealPlanId_DayNumber",
                table: "MealPlanDays",
                columns: new[] { "MealPlanId", "DayNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MealPlans_UserId_Status_GeneratedAt",
                table: "MealPlans",
                columns: new[] { "UserId", "Status", "GeneratedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PlannedMeals_MealPlanDayId_SlotOrder",
                table: "PlannedMeals",
                columns: new[] { "MealPlanDayId", "SlotOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlannedMeals_UserId_MealPlanId",
                table: "PlannedMeals",
                columns: new[] { "UserId", "MealPlanId" });

            migrationBuilder.CreateIndex(
                name: "IX_PlanningOutbox_PublishedAtUtc_CreatedAtUtc",
                table: "PlanningOutbox",
                columns: new[] { "PublishedAtUtc", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_UserChallengeDays_UserChallengeId_DayNumber",
                table: "UserChallengeDays",
                columns: new[] { "UserChallengeId", "DayNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserChallengeDays_UserChallengeId_LocalDate",
                table: "UserChallengeDays",
                columns: new[] { "UserChallengeId", "LocalDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserChallenges_ChallengeTemplateId",
                table: "UserChallenges",
                column: "ChallengeTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_UserChallenges_UserId_StartDate",
                table: "UserChallenges",
                columns: new[] { "UserId", "StartDate" });

            migrationBuilder.CreateIndex(
                name: "IX_UserChallenges_UserId_Status",
                table: "UserChallenges",
                columns: new[] { "UserId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ChallengeDayTemplates");

            migrationBuilder.DropTable(
                name: "FmdCycleDays");

            migrationBuilder.DropTable(
                name: "FmdEducationAcknowledgements");

            migrationBuilder.DropTable(
                name: "FmdSafetyAssessments");

            migrationBuilder.DropTable(
                name: "PlannedMeals");

            migrationBuilder.DropTable(
                name: "PlanningOutbox");

            migrationBuilder.DropTable(
                name: "UserChallengeDays");

            migrationBuilder.DropTable(
                name: "UserDietaryPreferences");

            migrationBuilder.DropTable(
                name: "FmdCycles");

            migrationBuilder.DropTable(
                name: "MealPlanDays");

            migrationBuilder.DropTable(
                name: "UserChallenges");

            migrationBuilder.DropTable(
                name: "MealPlans");

            migrationBuilder.DropTable(
                name: "ChallengeTemplates");
        }
    }
}
