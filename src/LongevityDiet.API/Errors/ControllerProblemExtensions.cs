using LongevityDiet.Services.Identity;
using Microsoft.AspNetCore.Mvc;

namespace LongevityDiet.API.Errors;

public static class ControllerProblemExtensions
{
    private static readonly Dictionary<string, int> StatusByErrorCode =
        new Dictionary<string, int>(StringComparer.Ordinal)
        {
            ["email_exists"] = StatusCodes.Status409Conflict,
            ["weak_password"] = StatusCodes.Status400BadRequest,
            ["invalid_credentials"] = StatusCodes.Status401Unauthorized,
            ["invalid_refresh_token"] = StatusCodes.Status401Unauthorized,
            ["account_disabled"] = StatusCodes.Status403Forbidden,
            ["user_not_found"] = StatusCodes.Status404NotFound,
            ["invalid_display_name"] = StatusCodes.Status400BadRequest,
            ["invalid_birth_year"] = StatusCodes.Status400BadRequest,
            ["invalid_meal_frequency"] = StatusCodes.Status400BadRequest,
            ["invalid_time_zone"] = StatusCodes.Status400BadRequest,
        };

    public static ObjectResult ToProblem<T>(
        this ControllerBase controller,
        ServiceResult<T> result,
        int defaultStatusCode = StatusCodes.Status400BadRequest)
    {
        var statusCode = result.ErrorCode is not null &&
                         StatusByErrorCode.TryGetValue(result.ErrorCode, out var mappedStatus)
            ? mappedStatus
            : defaultStatusCode;

        return controller.Problem(
            statusCode: statusCode,
            title: result.ErrorCode ?? "request_failed",
            detail: result.ErrorMessage ?? "The request could not be completed.");
    }
}
