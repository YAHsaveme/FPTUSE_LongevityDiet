using System.ComponentModel.DataAnnotations;

namespace LongevityDiet.API.Contracts.Profile;

public sealed record UpdateProfileRequest(
    [Required, MinLength(2), MaxLength(120)] string DisplayName,
    [Range(1900, 2100)] int? BirthYear,
    [Required, MaxLength(100)] string TimeZone,
    TimeOnly? WakeTime,
    TimeOnly? SleepTime,
    [Range(2, 4)] int PreferredMealFrequency,
    [MaxLength(500)] string? FoodPreference);

public sealed record ProfileResponse(
    Guid UserId,
    string Email,
    string DisplayName,
    int? BirthYear,
    string TimeZone,
    TimeOnly? WakeTime,
    TimeOnly? SleepTime,
    int PreferredMealFrequency,
    string? FoodPreference,
    bool ProfileCompleted);
