namespace LongevityDiet.Domain.Entities;

public sealed class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string NormalizedEmail { get; set; } = string.Empty;
    // Null for every legacy and newly registered address until OTP proof.
    public DateTime? EmailVerifiedAtUtc { get; set; }
    public string? EmailVerificationHash { get; set; }
    public DateTime? EmailVerificationExpiresAtUtc { get; set; }
    public DateTime? EmailVerificationLastSentAtUtc { get; set; }
    public int EmailVerificationAttempts { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Member;
    public AccountStatus Status { get; set; } = AccountStatus.Active;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public UserProfile? Profile { get; set; }
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}

public enum UserRole
{
    Member = 1,
    Admin = 2
}

public enum AccountStatus
{
    Active = 1,
    Disabled = 2
}
