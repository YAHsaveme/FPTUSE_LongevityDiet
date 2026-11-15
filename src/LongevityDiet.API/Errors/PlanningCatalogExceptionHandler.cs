using LongevityDiet.Services.Planning;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace LongevityDiet.API.Errors;

/// <summary>Fail closed with an actionable, safe API contract for missing Planner data.</summary>
public sealed class PlanningCatalogExceptionHandler(
    ILogger<PlanningCatalogExceptionHandler> logger,
    IProblemDetailsService problemDetailsService) : IExceptionHandler
{
    private static readonly Action<ILogger, string, Exception?> LogMissingReferenceData =
        LoggerMessage.Define<string>(LogLevel.Warning,
            new EventId(50301, "PlannerCatalogUnavailable"),
            "Planner reference data unavailable: {Code}");

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not PlanningCatalogUnavailableException unavailable)
            return false; // Never reinterpret unrelated infrastructure or programming failures.

        LogMissingReferenceData(logger, unavailable.Code, null);
        httpContext.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
        httpContext.Response.Headers.CacheControl = "no-store";

        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status503ServiceUnavailable,
            Title = unavailable.Code,
            Detail = unavailable.Message,
            Type = "about:blank"
        };
        problem.Extensions["code"] = unavailable.Code;
        await problemDetailsService.WriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = problem,
            Exception = exception
        });
        return true;
    }
}
