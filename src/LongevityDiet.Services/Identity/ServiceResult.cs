namespace LongevityDiet.Services.Identity;

public sealed record ServiceResult<T>(
    bool Succeeded,
    T? Value,
    string? ErrorCode,
    string? ErrorMessage);

public static class ServiceResult
{
    public static ServiceResult<T> Success<T>(T value) =>
        new(true, value, null, null);

    public static ServiceResult<T> Failure<T>(string errorCode, string errorMessage) =>
        new(false, default, errorCode, errorMessage);
}
