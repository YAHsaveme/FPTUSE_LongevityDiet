using Microsoft.EntityFrameworkCore;
using LongevityDiet.Domain.Entities;

namespace LongevityDiet.Tracking;

// Target ownership: LongevityTrackingDb; never holds identity/catalog entities.
public sealed class TrackingDbContext(DbContextOptions<TrackingDbContext> options) : DbContext(options)
{
    public DbSet<MealLog> MealLogs => Set<MealLog>();
    public DbSet<MealLogItem> MealLogItems => Set<MealLogItem>();
    public DbSet<EatingWindowSnapshot> EatingWindowSnapshots => Set<EatingWindowSnapshot>();
    public DbSet<ActivityLog> Activities => Set<ActivityLog>();
    public DbSet<ActivityGoal> Goals => Set<ActivityGoal>();
    public DbSet<ScoreConfigurationVersion> ScoreConfigurations => Set<ScoreConfigurationVersion>();
    public DbSet<AdherenceScore> Scores => Set<AdherenceScore>();
    public DbSet<ScoreDimension> ScoreDimensions => Set<ScoreDimension>();
    public DbSet<TrackingScoreSignal> ScoreSignals => Set<TrackingScoreSignal>();
    public DbSet<TrackingOutboxEvent> Outbox => Set<TrackingOutboxEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // The legacy main DB retains its own tables until an audited backfill
        // and cutover. This owner has NO SQL FK to Identity, Planning or Catalog.
        var mealLogs = modelBuilder.Entity<MealLog>();
        mealLogs.ToTable("MealLogs");
        mealLogs.HasKey(x => x.Id);
        mealLogs.Property(x => x.TimeZone).HasMaxLength(100).IsRequired();
        mealLogs.Property(x => x.MealType).HasConversion<string>().HasMaxLength(24);
        mealLogs.Property(x => x.Title).HasMaxLength(200).IsRequired();
        mealLogs.Property(x => x.Notes).HasMaxLength(1000);
        mealLogs.Property(x => x.TotalProteinGrams).HasPrecision(8, 2);
        mealLogs.Property(x => x.TotalCarbsGrams).HasPrecision(8, 2);
        mealLogs.Property(x => x.TotalFatGrams).HasPrecision(8, 2);
        mealLogs.Property(x => x.TotalFiberGrams).HasPrecision(8, 2);
        mealLogs.HasIndex(x => new { x.UserId, x.LocalDate, x.IsDeleted });
        mealLogs.HasIndex(x => new { x.UserId, x.EatenAt });
        mealLogs.HasMany(x => x.Items).WithOne(x => x.MealLog)
            .HasForeignKey(x => x.MealLogId).OnDelete(DeleteBehavior.Cascade);

        var item = modelBuilder.Entity<MealLogItem>();
        item.ToTable("MealLogItems");
        item.HasKey(x => x.Id);
        item.Property(x => x.FoodCode).HasMaxLength(80);
        item.Property(x => x.FoodName).HasMaxLength(200).IsRequired();
        item.Property(x => x.ServingAmount).HasPrecision(8, 2);
        item.Property(x => x.ServingUnit).HasMaxLength(64).IsRequired();
        item.Property(x => x.ProteinGrams).HasPrecision(8, 2);
        item.Property(x => x.CarbsGrams).HasPrecision(8, 2);
        item.Property(x => x.FatGrams).HasPrecision(8, 2);
        item.Property(x => x.FiberGrams).HasPrecision(8, 2);

        var window = modelBuilder.Entity<EatingWindowSnapshot>();
        window.ToTable("EatingWindowSnapshots");
        window.HasKey(x => x.Id);
        window.Property(x => x.TimeZone).HasMaxLength(100).IsRequired();
        window.Property(x => x.StatusCode).HasMaxLength(64).IsRequired();
        window.Property(x => x.SummaryMessage).HasMaxLength(600).IsRequired();
        window.HasIndex(x => new { x.UserId, x.LocalDate }).IsUnique();

        var outbox = modelBuilder.Entity<TrackingOutboxEvent>();
        outbox.ToTable("TrackingOutbox");
        outbox.HasKey(x => x.EventId);
        outbox.Property(x => x.EventType).HasMaxLength(100);
        outbox.Property(x => x.PayloadJson).HasMaxLength(4096);
        outbox.HasIndex(x => new { x.PublishedAtUtc, x.CreatedAtUtc });

        var activities = modelBuilder.Entity<ActivityLog>();
        activities.ToTable("ActivityLogs");
        activities.HasKey(a => a.Id);
        activities.Property(a => a.Kind).HasConversion<string>().HasMaxLength(24);
        activities.Property(a => a.Note).HasMaxLength(800);
        activities.HasIndex(a => new { a.UserId, a.StartedAtUtc });
        activities.HasIndex(a => new { a.UserId, a.IsDeleted, a.StartedAtUtc });

        var goals = modelBuilder.Entity<ActivityGoal>();
        goals.ToTable("ActivityGoals");
        goals.HasKey(g => g.UserId);

        var versions = modelBuilder.Entity<ScoreConfigurationVersion>();
        versions.ToTable("ScoreConfigurationVersions");
        versions.HasKey(v => v.Version);
        versions.Property(v => v.Version).HasMaxLength(40);
        versions.Property(v => v.SourceReference).HasMaxLength(512);
        versions.Property(v => v.ActivityWeight).HasPrecision(5, 4);
        versions.Property(v => v.MealWeight).HasPrecision(5, 4);
        versions.Property(v => v.EatingWindowWeight).HasPrecision(5, 4);
        versions.HasData(new ScoreConfigurationVersion
        {
            Version = "ldas-v1",
            Published = true,
            PublishedAtUtc = new DateTimeOffset(2026, 11, 1, 0, 0, 0, TimeSpan.Zero),
            ActivityWeight = 0.35m,
            MealWeight = 0.45m,
            EatingWindowWeight = 0.20m,
            SourceReference = "project-scoring-policy-v1; educational, not clinically validated",
        });

        var scores = modelBuilder.Entity<AdherenceScore>();
        scores.ToTable("AdherenceScores");
        scores.HasKey(s => s.Id);
        scores.Property(s => s.Version).HasMaxLength(40);
        scores.Property(s => s.Score).HasPrecision(5, 2);
        scores.Property(s => s.CoveragePercent).HasPrecision(5, 2);
        scores.Property(s => s.MissingDataJson).HasMaxLength(512);
        scores.HasIndex(s => new { s.UserId, s.LocalDate, s.Version }).IsUnique();
        scores.HasMany(s => s.Dimensions).WithOne(d => d.AdherenceScore)
            .HasForeignKey(d => d.AdherenceScoreId).OnDelete(DeleteBehavior.Cascade);

        var dimensions = modelBuilder.Entity<ScoreDimension>();
        dimensions.ToTable("ScoreDimensions");
        dimensions.HasKey(d => d.Id);
        dimensions.Property(d => d.Code).HasMaxLength(32);
        dimensions.Property(d => d.ReasonCode).HasMaxLength(128);
        dimensions.Property(d => d.Weight).HasPrecision(5, 4);
        dimensions.Property(d => d.RawScore).HasPrecision(5, 2);
        dimensions.Property(d => d.WeightedScore).HasPrecision(5, 2);
        dimensions.HasIndex(d => new { d.AdherenceScoreId, d.Code }).IsUnique();

        var signals = modelBuilder.Entity<TrackingScoreSignal>();
        signals.ToTable("TrackingScoreSignals");
        signals.HasKey(s => s.Id);
        signals.Property(s => s.Percent).HasPrecision(5, 2);
        signals.Property(s => s.DimensionCode).HasMaxLength(32);
        signals.Property(s => s.SourceVersion).HasMaxLength(64);
        signals.HasIndex(s => new { s.UserId, s.LocalDate, s.DimensionCode }).IsUnique();
        signals.HasIndex(s => s.SourceEventId).IsUnique();
    }
}
