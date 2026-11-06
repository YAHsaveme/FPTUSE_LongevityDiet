using Grpc.Core;
using LongevityDiet.API.Security;
using LongevityDiet.Recommendation.Contracts;
using LongevityDiet.Tracking;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace LongevityDiet.API.Controllers;

public sealed record ActivityAdviceView(
    DateOnly WeekStart, DateOnly WeekEnd, int CompletedMinutes,
    int WeeklyMinutesGoal, int StrengthSessions, int WeeklyStrengthGoal,
    string Status, int RemainingMinutes, int RemainingStrengthSessions,
    string Guidance, string Disclaimer);

/// <summary>
/// REST -> user-scoped TrackingService -> real gRPC Recommendation service.
/// The gRPC payload never contains a name, token, profile, or user ID.
/// </summary>
[ApiController]
[Authorize]
[EnableRateLimiting("member-api")]
[Route("api/v1/recommendations")]
public sealed partial class RecommendationController(
    TrackingService tracking,
    ICurrentUser currentUser,
    ActivityCoach.ActivityCoachClient coach,
    ILogger<RecommendationController> logger) : ControllerBase
{
    [LoggerMessage(EventId = 4510, Level = LogLevel.Warning,
        Message = "Activity recommendation gRPC unavailable (status {GrpcStatus})")]
    private static partial void WarnGrpcUnavailable(ILogger logger, Grpc.Core.StatusCode grpcStatus);

    [HttpGet("activity")]
    [ProducesResponseType<ActivityAdviceView>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Activity(DateOnly? weekStart, CancellationToken ct)
    {
        if (currentUser.UserId is not { } userId) return Unauthorized();

        ActivitySummary summary;
        try
        {
            summary = await tracking.GetWeeklySummaryAsync(userId, weekStart, ct);
        }
        catch (TrackingInputException error)
        {
            return Problem(statusCode: error.Code == "inactive_user" ? 403 : 400,
                title: error.Code, detail: error.Message);
        }

        try
        {
            var progress = new ActivityProgressRequest
            {
                CompletedMinutes = summary.EquivalentMinutes,
                WeeklyMinutesGoal = summary.WeeklyMinutesTarget,
                CompletedStrengthSessions = summary.StrengthSessions,
                WeeklyStrengthGoal = summary.WeeklyStrengthSessionsTarget
            };
            using var call = coach.RecommendAsync(
                progress, deadline: DateTime.UtcNow.AddSeconds(3), cancellationToken: ct);
            var reply = await call.ResponseAsync;
            return Ok(new ActivityAdviceView(
                summary.WeekStart, summary.WeekEnd, summary.EquivalentMinutes,
                summary.WeeklyMinutesTarget, summary.StrengthSessions,
                summary.WeeklyStrengthSessionsTarget, reply.Status,
                reply.RemainingMinutes, reply.RemainingStrengthSessions,
                reply.Guidance, reply.Disclaimer));
        }
        catch (RpcException error) when (error.StatusCode is
            Grpc.Core.StatusCode.Unavailable or Grpc.Core.StatusCode.DeadlineExceeded)
        {
            WarnGrpcUnavailable(logger, error.StatusCode);
            return Problem(statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "recommendation_unavailable",
                detail: "The recommendation service is temporarily unavailable.");
        }
    }
}
