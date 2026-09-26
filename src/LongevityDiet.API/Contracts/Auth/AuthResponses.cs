namespace LongevityDiet.API.Contracts.Auth;

public sealed record AuthSessionResponse(
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAt,
    SessionUserResponse User);

public sealed record SessionUserResponse(
    Guid Id,
    string Email,
    string DisplayName,
    string Role,
    bool ProfileCompleted);
