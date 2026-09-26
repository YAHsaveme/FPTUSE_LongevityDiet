using LongevityDiet.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LongevityDiet.Repositories;

public sealed class LongevityDietDbContext(DbContextOptions<LongevityDietDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var user = modelBuilder.Entity<User>();
        user.ToTable("Users");
        user.HasKey(x => x.Id);
        user.Property(x => x.Email).HasMaxLength(320).IsRequired();
        user.Property(x => x.NormalizedEmail).HasMaxLength(320).IsRequired();
        user.HasIndex(x => x.NormalizedEmail).IsUnique();
        user.Property(x => x.PasswordHash).HasMaxLength(512).IsRequired();
        user.Property(x => x.DisplayName).HasMaxLength(120).IsRequired();
        user.Property(x => x.Role).HasConversion<string>().HasMaxLength(24);
        user.Property(x => x.Status).HasConversion<string>().HasMaxLength(24);
        user.HasOne(x => x.Profile)
            .WithOne(x => x.User)
            .HasForeignKey<UserProfile>(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        var profile = modelBuilder.Entity<UserProfile>();
        profile.ToTable("UserProfiles");
        profile.HasKey(x => x.UserId);
        profile.Property(x => x.TimeZone).HasMaxLength(100).IsRequired();
        profile.Property(x => x.FoodPreference).HasMaxLength(500);

        var refreshToken = modelBuilder.Entity<RefreshToken>();
        refreshToken.ToTable("RefreshTokens");
        refreshToken.HasKey(x => x.Id);
        refreshToken.Property(x => x.TokenHash).HasMaxLength(64).IsRequired();
        refreshToken.HasIndex(x => x.TokenHash).IsUnique();
        refreshToken.HasIndex(x => new { x.UserId, x.ExpiresAt });
        refreshToken.HasOne(x => x.User)
            .WithMany(x => x.RefreshTokens)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
