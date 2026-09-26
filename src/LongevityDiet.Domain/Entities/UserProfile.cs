namespace LongevityDiet.Domain.Entities;

public sealed class UserProfile
{
    public Guid UserId { get; set; }
    public int? BirthYear { get; set; }
    public string TimeZone { get; set; } = "Asia/Ho_Chi_Minh";
    public TimeOnly? WakeTime { get; set; }
    public TimeOnly? SleepTime { get; set; }
    public int PreferredMealFrequency { get; set; } = 3;
    public string? FoodPreference { get; set; }
    public bool ProfileCompleted { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User User { get; set; } = null!;
}
