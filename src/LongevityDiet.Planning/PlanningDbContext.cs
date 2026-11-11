using LongevityDiet.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LongevityDiet.Planning;

// ADR-005: owns Planning+Challenge+FMD data, and NO Users/Catalog/Tracking SQL.
public sealed class PlanningDbContext(DbContextOptions<PlanningDbContext> options) : DbContext(options)
{
    public DbSet<UserDietaryPreference> UserDietaryPreferences => Set<UserDietaryPreference>();
    public DbSet<MealPlan> MealPlans => Set<MealPlan>();
    public DbSet<MealPlanDay> MealPlanDays => Set<MealPlanDay>();
    public DbSet<PlannedMeal> PlannedMeals => Set<PlannedMeal>();
    public DbSet<ChallengeTemplate> ChallengeTemplates => Set<ChallengeTemplate>();
    public DbSet<ChallengeDayTemplate> ChallengeDayTemplates => Set<ChallengeDayTemplate>();
    public DbSet<UserChallenge> UserChallenges => Set<UserChallenge>();
    public DbSet<UserChallengeDay> UserChallengeDays => Set<UserChallengeDay>();
    public DbSet<FmdEducationAcknowledgement> FmdEducationAcknowledgements => Set<FmdEducationAcknowledgement>();
    public DbSet<FmdSafetyAssessment> FmdSafetyAssessments => Set<FmdSafetyAssessment>();
    public DbSet<FmdCycle> FmdCycles => Set<FmdCycle>();
    public DbSet<FmdCycleDay> FmdCycleDays => Set<FmdCycleDay>();
    public DbSet<PlanningOutboxEvent> Outbox => Set<PlanningOutboxEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var preferences = modelBuilder.Entity<UserDietaryPreference>();
        preferences.ToTable("UserDietaryPreferences");
        preferences.HasKey(x => x.UserId);
        preferences.Property(x => x.DietaryPattern).HasMaxLength(64).IsRequired();
        preferences.Property(x => x.AllergiesCsv).HasMaxLength(1000).IsRequired();
        preferences.Property(x => x.ExcludedFoodsCsv).HasMaxLength(1000).IsRequired();
        preferences.Property(x => x.PreferredCuisine).HasMaxLength(120);

        var plans = modelBuilder.Entity<MealPlan>();
        plans.ToTable("MealPlans");
        plans.HasKey(x => x.Id);
        plans.Property(x => x.RuleSetVersion).HasMaxLength(64).IsRequired();
        plans.Property(x => x.Status).HasConversion<string>().HasMaxLength(24);
        plans.Property(x => x.TimeZone).HasMaxLength(100).IsRequired();
        plans.Property(x => x.DietaryPattern).HasMaxLength(64).IsRequired();
        plans.Property(x => x.AppliedAllergiesCsv).HasMaxLength(1000).IsRequired();
        plans.Property(x => x.AppliedExclusionsCsv).HasMaxLength(1000).IsRequired();
        plans.Property(x => x.ReasonCodesCsv).HasMaxLength(500).IsRequired();
        plans.Property(x => x.PlanExplanation).HasMaxLength(1000).IsRequired();
        plans.HasIndex(x => new { x.UserId, x.Status, x.GeneratedAt });
        plans.HasMany(x => x.Days).WithOne(x => x.MealPlan)
            .HasForeignKey(x => x.MealPlanId).OnDelete(DeleteBehavior.Cascade);

        var days = modelBuilder.Entity<MealPlanDay>();
        days.ToTable("MealPlanDays");
        days.HasKey(x => x.Id);
        days.Property(x => x.DailyFocusCode).HasMaxLength(64).IsRequired();
        days.Property(x => x.DailyFocusTitle).HasMaxLength(240).IsRequired();
        days.HasIndex(x => new { x.MealPlanId, x.DayNumber }).IsUnique();
        days.HasMany(x => x.Meals).WithOne(x => x.MealPlanDay)
            .HasForeignKey(x => x.MealPlanDayId).OnDelete(DeleteBehavior.Cascade);

        var meals = modelBuilder.Entity<PlannedMeal>();
        meals.ToTable("PlannedMeals");
        meals.HasKey(x => x.Id);
        meals.Property(x => x.SlotType).HasConversion<string>().HasMaxLength(24);
        meals.Property(x => x.CandidateCode).HasMaxLength(80).IsRequired();
        meals.Property(x => x.Title).HasMaxLength(200).IsRequired();
        meals.Property(x => x.Description).HasMaxLength(600).IsRequired();
        meals.Property(x => x.Cuisine).HasMaxLength(80).IsRequired();
        meals.Property(x => x.ServingSize).HasPrecision(8, 2);
        meals.Property(x => x.ServingUnit).HasMaxLength(64).IsRequired();
        meals.Property(x => x.ProteinGrams).HasPrecision(8, 2);
        meals.Property(x => x.CarbsGrams).HasPrecision(8, 2);
        meals.Property(x => x.FatGrams).HasPrecision(8, 2);
        meals.Property(x => x.FiberGrams).HasPrecision(8, 2);
        meals.Property(x => x.AllergensCsv).HasMaxLength(500).IsRequired();
        meals.Property(x => x.IngredientsCsv).HasMaxLength(800).IsRequired();
        meals.Property(x => x.DeterministicScore).HasPrecision(8, 2);
        meals.Property(x => x.ReasonCodesCsv).HasMaxLength(500).IsRequired();
        meals.Property(x => x.ExplanationSummary).HasMaxLength(1000).IsRequired();
        meals.HasIndex(x => new { x.MealPlanDayId, x.SlotOrder }).IsUnique();
        meals.HasIndex(x => new { x.UserId, x.MealPlanId });

        var templates = modelBuilder.Entity<ChallengeTemplate>();
        templates.ToTable("ChallengeTemplates");
        templates.HasKey(x => x.Id);
        templates.Property(x => x.Code).HasMaxLength(64).IsRequired();
        templates.Property(x => x.Title).HasMaxLength(200).IsRequired();
        templates.Property(x => x.Description).HasMaxLength(1000).IsRequired();
        templates.HasIndex(x => x.Code).IsUnique();
        templates.HasMany(x => x.Days).WithOne(x => x.ChallengeTemplate)
            .HasForeignKey(x => x.ChallengeTemplateId).OnDelete(DeleteBehavior.Cascade);

        var templateDays = modelBuilder.Entity<ChallengeDayTemplate>();
        templateDays.ToTable("ChallengeDayTemplates");
        templateDays.HasKey(x => x.Id);
        templateDays.Property(x => x.Title).HasMaxLength(200).IsRequired();
        templateDays.Property(x => x.Guidance).HasMaxLength(1000).IsRequired();
        templateDays.HasIndex(x => new { x.ChallengeTemplateId, x.DayNumber }).IsUnique();

        var challenges = modelBuilder.Entity<UserChallenge>();
        challenges.ToTable("UserChallenges");
        challenges.HasKey(x => x.Id);
        challenges.Property(x => x.TimeZone).HasMaxLength(100).IsRequired();
        challenges.Property(x => x.Status).HasConversion<string>().HasMaxLength(24);
        challenges.HasIndex(x => new { x.UserId, x.Status });
        challenges.HasIndex(x => x.UserId)
            .IsUnique()
            .HasFilter("[Status] = N'Active'");
        challenges.HasIndex(x => new { x.UserId, x.StartDate });
        challenges.HasOne(x => x.ChallengeTemplate).WithMany()
            .HasForeignKey(x => x.ChallengeTemplateId).OnDelete(DeleteBehavior.Restrict);
        challenges.HasMany(x => x.Days).WithOne(x => x.UserChallenge)
            .HasForeignKey(x => x.UserChallengeId).OnDelete(DeleteBehavior.Cascade);

        var challengeDays = modelBuilder.Entity<UserChallengeDay>();
        challengeDays.ToTable("UserChallengeDays");
        challengeDays.HasKey(x => x.Id);
        challengeDays.HasIndex(x => new { x.UserChallengeId, x.DayNumber }).IsUnique();
        challengeDays.HasIndex(x => new { x.UserChallengeId, x.LocalDate }).IsUnique();

        var ack = modelBuilder.Entity<FmdEducationAcknowledgement>();
        ack.ToTable("FmdEducationAcknowledgements");
        ack.HasKey(x => x.Id);
        ack.Property(x => x.EducationVersion).HasMaxLength(64).IsRequired();
        ack.Property(x => x.SourceCitation).HasMaxLength(500).IsRequired();
        ack.HasIndex(x => new { x.UserId, x.EducationVersion });

        var assessment = modelBuilder.Entity<FmdSafetyAssessment>();
        assessment.ToTable("FmdSafetyAssessments");
        assessment.HasKey(x => x.Id);
        assessment.Property(x => x.AssessmentVersion).HasMaxLength(64).IsRequired();
        assessment.Property(x => x.ResultStatus).HasConversion<string>().HasMaxLength(32);
        assessment.Property(x => x.TriggeredRiskCodesCsv).HasMaxLength(1000).IsRequired();
        assessment.Property(x => x.RecommendationsSummary).HasMaxLength(1000).IsRequired();
        assessment.Property(x => x.AnswersJson).HasMaxLength(4000).IsRequired();
        assessment.Property(x => x.Notes).HasMaxLength(600);
        assessment.HasIndex(x => new { x.UserId, x.EvaluatedAt });

        var cycles = modelBuilder.Entity<FmdCycle>();
        cycles.ToTable("FmdCycles");
        cycles.HasKey(x => x.Id);
        cycles.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
        cycles.Property(x => x.Notes).HasMaxLength(1000);
        cycles.Property(x => x.StopReason).HasMaxLength(500);
        cycles.HasIndex(x => new { x.UserId, x.Status });
        cycles.HasMany(x => x.Days).WithOne(x => x.FmdCycle)
            .HasForeignKey(x => x.FmdCycleId).OnDelete(DeleteBehavior.Cascade);

        var cycleDays = modelBuilder.Entity<FmdCycleDay>();
        cycleDays.ToTable("FmdCycleDays");
        cycleDays.HasKey(x => x.Id);
        cycleDays.Property(x => x.WaterIntakeLiters).HasPrecision(5, 2);
        cycleDays.Property(x => x.Symptoms).HasMaxLength(500);
        cycleDays.Property(x => x.DailyNotes).HasMaxLength(1000);
        cycleDays.HasIndex(x => new { x.FmdCycleId, x.DayNumber }).IsUnique();

        var outbox = modelBuilder.Entity<PlanningOutboxEvent>();
        outbox.ToTable("PlanningOutbox");
        outbox.HasKey(x => x.Id);
        outbox.Property(x => x.EventType).HasMaxLength(96).IsRequired();
        outbox.Property(x => x.PayloadJson).HasMaxLength(4096).IsRequired();
        outbox.HasIndex(x => new { x.PublishedAtUtc, x.CreatedAtUtc });
    }
}

// Planning emits foreign-domain state changes through versioned events.
// Cross-domain UserId is an immutable GUID scalar; there are no foreign DB FKs.
public sealed class PlanningOutboxEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? PublishedAtUtc { get; set; }
    public int PublishAttempts { get; set; }
}
