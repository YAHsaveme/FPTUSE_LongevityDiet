using LongevityDiet.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LongevityDiet.Identity;

// Service-owned EF model. Only Identity data; never reference another domain DB.
public sealed class IdentityDbContext(DbContextOptions<IdentityDbContext> options)
    : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<ReminderPreference> ReminderPreferences => Set<ReminderPreference>();
    public DbSet<UserNotification> Notifications => Set<UserNotification>();
    public DbSet<IdentityOutboxEvent> IdentityOutbox => Set<IdentityOutboxEvent>();
    public DbSet<IdentityInboxEvent> IdentityInbox => Set<IdentityInboxEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var users = modelBuilder.Entity<User>();
        users.ToTable("Users");
        users.HasKey(x => x.Id);
        users.Property(x => x.Email).HasMaxLength(320).IsRequired();
        users.Property(x => x.NormalizedEmail).HasMaxLength(320).IsRequired();
        users.Property(x => x.EmailVerificationHash).HasMaxLength(64);
        users.HasIndex(x => x.NormalizedEmail).IsUnique();
        users.Property(x => x.PasswordHash).HasMaxLength(512).IsRequired();
        users.Property(x => x.DisplayName).HasMaxLength(120).IsRequired();
        users.Property(x => x.Role).HasConversion<string>().HasMaxLength(24);
        users.Property(x => x.Status).HasConversion<string>().HasMaxLength(24);
        users.HasOne(x => x.Profile).WithOne(x => x.User)
            .HasForeignKey<UserProfile>(x => x.UserId).OnDelete(DeleteBehavior.Cascade);

        var profile = modelBuilder.Entity<UserProfile>();
        profile.ToTable("UserProfiles");
        profile.HasKey(x => x.UserId);
        profile.Property(x => x.TimeZone).HasMaxLength(100).IsRequired();
        profile.Property(x => x.FoodPreference).HasMaxLength(500);

        var token = modelBuilder.Entity<RefreshToken>();
        token.ToTable("RefreshTokens");
        token.HasKey(x => x.Id);
        token.Property(x => x.TokenHash).HasMaxLength(64).IsRequired();
        token.HasIndex(x => x.TokenHash).IsUnique();
        token.HasIndex(x => new { x.UserId, x.ExpiresAt });
        token.HasOne(x => x.User).WithMany(x => x.RefreshTokens)
            .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);

        var reminders = modelBuilder.Entity<ReminderPreference>();
        reminders.ToTable("ReminderPreferences");
        reminders.HasKey(x => x.UserId);
        reminders.Property(x => x.EmailOptedIn).HasDefaultValue(false);
        reminders.HasOne<User>().WithOne().HasForeignKey<ReminderPreference>(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        var notifications = modelBuilder.Entity<UserNotification>();
        notifications.ToTable("UserNotifications");
        notifications.HasKey(x => x.Id);
        notifications.Property(x => x.Category).HasConversion<string>().HasMaxLength(32);
        notifications.Property(x => x.Title).HasMaxLength(120);
        notifications.Property(x => x.Body).HasMaxLength(500);
        notifications.Property(x => x.DeepLink).HasMaxLength(120);
        notifications.Property(x => x.DeduplicationKey).HasMaxLength(160);
        notifications.Property(x => x.EmailDeliveryStatus).HasMaxLength(16).HasDefaultValue("None");
        notifications.HasIndex(x => new { x.EmailDeliveryStatus, x.EmailQueuedAtUtc });
        notifications.HasIndex(x => new { x.UserId, x.CreatedAtUtc });
        notifications.HasIndex(x => new { x.UserId, x.DeduplicationKey }).IsUnique();
        notifications.HasOne<User>().WithMany().HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        var outbox = modelBuilder.Entity<IdentityOutboxEvent>();
        outbox.ToTable("IdentityOutbox");
        outbox.HasKey(x => x.Id);
        outbox.Property(x => x.EventType).HasMaxLength(96);
        outbox.Property(x => x.PayloadJson).HasMaxLength(4096);
        outbox.HasIndex(x => new { x.PublishedAtUtc, x.CreatedAtUtc });

        modelBuilder.Entity<IdentityInboxEvent>().ToTable("IdentityInbox").HasKey(x => x.EventId);
    }
}
