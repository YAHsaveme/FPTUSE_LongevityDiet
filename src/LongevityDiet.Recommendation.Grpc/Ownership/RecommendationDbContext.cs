using LongevityDiet.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace LongevityDiet.Recommendation.Grpc.Ownership;

// Recommendation owns feedback/preferences and a local event Outbox, never
// Users, MealPlans, MealLogs, Catalog or Worker tables.
public sealed class RecommendationDbContext(DbContextOptions<RecommendationDbContext> options)
    : DbContext(options)
{
    public DbSet<RecommendationFeedback> Feedback => Set<RecommendationFeedback>();
    public DbSet<UserFoodPreference> FoodPreferences => Set<UserFoodPreference>();
    public DbSet<RecommendationOutbox> Outbox => Set<RecommendationOutbox>();
    public DbSet<RecommendationInbox> Inbox => Set<RecommendationInbox>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var feedback = modelBuilder.Entity<RecommendationFeedback>();
        feedback.ToTable("RecommendationFeedbacks");
        feedback.HasKey(x => x.Id);
        feedback.Property(x => x.CandidateCode).HasMaxLength(80).IsRequired();
        feedback.Property(x => x.CandidateTitle).HasMaxLength(200).IsRequired();
        feedback.Property(x => x.FeedbackType).HasConversion<string>().HasMaxLength(24);
        feedback.Property(x => x.ReasonCode).HasMaxLength(80).IsRequired();
        feedback.Property(x => x.Notes).HasMaxLength(600);
        feedback.Property(x => x.RuleSetVersion).HasMaxLength(64).IsRequired();
        feedback.Property(x => x.WeightProfileVersion).HasMaxLength(64).IsRequired();
        feedback.HasIndex(x => new { x.UserId, x.CandidateCode, x.CreatedAt });

        var preference = modelBuilder.Entity<UserFoodPreference>();
        preference.ToTable("UserFoodPreferences");
        preference.HasKey(x => x.Id);
        preference.Property(x => x.FoodToken).HasMaxLength(120).IsRequired();
        preference.Property(x => x.DisplayLabel).HasMaxLength(200).IsRequired();
        preference.Property(x => x.PreferenceKind).HasConversion<string>().HasMaxLength(32);
        preference.Property(x => x.Source).HasMaxLength(64).IsRequired();
        preference.Property(x => x.Notes).HasMaxLength(500);
        preference.HasIndex(x => new { x.UserId, x.FoodToken }).IsUnique();

        var outbox = modelBuilder.Entity<RecommendationOutbox>();
        outbox.ToTable("RecommendationOutbox");
        outbox.HasKey(x => x.EventId);
        outbox.Property(x => x.EventType).HasMaxLength(100).IsRequired();
        outbox.Property(x => x.PayloadJson).HasMaxLength(4096).IsRequired();
        outbox.HasIndex(x => new { x.PublishedAtUtc, x.CreatedAtUtc });

        var inbox = modelBuilder.Entity<RecommendationInbox>();
        inbox.ToTable("RecommendationInbox");
        inbox.HasKey(x => x.EventId);
        inbox.Property(x => x.EventType).HasMaxLength(100).IsRequired();
        inbox.HasIndex(x => x.ProcessedAtUtc);
    }
}

public sealed class RecommendationOutbox
{
    public Guid EventId { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string EventType { get; set; } = "";
    public string PayloadJson { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? PublishedAtUtc { get; set; }
    public int PublishAttempts { get; set; }
}

public sealed class RecommendationInbox
{
    public Guid EventId { get; set; }
    public string EventType { get; set; } = "";
    public DateTime ProcessedAtUtc { get; set; }
}

public sealed class RecommendationDesignTimeFactory :
    IDesignTimeDbContextFactory<RecommendationDbContext>
{
    public RecommendationDbContext CreateDbContext(string[] args)
    {
        var connection = Environment.GetEnvironmentVariable("ConnectionStrings__Recommendation")
            ?? "Server=localhost;Database=LongevityRecommendationDb;Trusted_Connection=True;TrustServerCertificate=True";
        return new RecommendationDbContext(
            new DbContextOptionsBuilder<RecommendationDbContext>().UseSqlServer(connection).Options);
    }
}
