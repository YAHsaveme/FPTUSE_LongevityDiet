namespace LongevityDiet.Services.Identity;

public sealed record RegisterUserCommand(string Email, string Password, string DisplayName);
public sealed record LoginUserCommand(string Email, string Password);

public sealed record UpdateProfileCommand(
    string DisplayName,
    int? BirthYear,
    string TimeZone,
    TimeOnly? WakeTime,
    TimeOnly? SleepTime,
    int PreferredMealFrequency,
    string? FoodPreference);

public sealed record UserSummary(
    Guid Id,
    string Email,
    string DisplayName,
    string Role,
    bool ProfileCompleted);

public sealed record ProfileSummary(
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

public sealed record AccessTokenResult(string Token, DateTimeOffset ExpiresAt);

public sealed record AuthenticatedSession(
    UserSummary User,
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAt,
    string RefreshToken,
    DateTimeOffset RefreshTokenExpiresAt);
