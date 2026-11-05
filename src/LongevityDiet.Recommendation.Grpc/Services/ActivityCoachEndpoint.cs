using Grpc.Core;
using LongevityDiet.Recommendation.Contracts;

namespace LongevityDiet.Recommendation.Grpc.Services;

/// <summary>
/// Independent, deterministic recommendation service for PRN232.
/// These are user-configured activity goals, not medical recommendations.
/// </summary>
public sealed class ActivityCoachEndpoint : ActivityCoach.ActivityCoachBase
{
    public override Task<ActivityAdviceReply> Recommend(
        ActivityProgressRequest request, ServerCallContext context)
    {
        if (request.WeeklyMinutesGoal is < 1 or > 1000 ||
            request.CompletedMinutes is < 0 or > 10000 ||
            request.WeeklyStrengthGoal is < 0 or > 7 ||
            request.CompletedStrengthSessions is < 0 or > 100)
        {
            throw new RpcException(new Status(StatusCode.InvalidArgument,
                "Activity progress or configured goals are invalid."));
        }

        var remainingMinutes = Math.Max(0, request.WeeklyMinutesGoal - request.CompletedMinutes);
        var remainingStrength = Math.Max(0, request.WeeklyStrengthGoal -
            request.CompletedStrengthSessions);

        var (status, guidance) = (remainingMinutes, remainingStrength) switch
        {
            (0, 0) => ("goal_met",
                "Bạn đã đạt mục tiêu vận động tuần do mình đặt ra. Hãy duy trì thói quen phù hợp."),
            (0, _) => ("strength_remaining",
                $"Bạn đã đạt mục tiêu phút vận động. Còn {remainingStrength} buổi tập sức mạnh theo mục tiêu đã đặt."),
            (_, 0) => ("minutes_remaining",
                $"Bạn còn {remainingMinutes} phút vận động quy đổi để đạt mục tiêu tuần đã đặt."),
            _ => ("both_remaining",
                $"Bạn còn {remainingMinutes} phút vận động quy đổi và {remainingStrength} buổi tập sức mạnh theo mục tiêu tuần đã đặt.")
        };

        return Task.FromResult(new ActivityAdviceReply
        {
            Status = status,
            RemainingMinutes = remainingMinutes,
            RemainingStrengthSessions = remainingStrength,
            Guidance = guidance,
            Disclaimer = "Gợi ý mang tính tham khảo về thói quen, không phải lời khuyên y khoa."
        });
    }
}
