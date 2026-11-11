using System.Security.Claims;
using LongevityDiet.Tracking;
using Microsoft.AspNetCore.Routing;

namespace LongevityDiet.Tracking.Api;

public static class TrackingEndpoints
{
    public static void MapTrackingEndpoints(this RouteGroupBuilder api)
    {
        api.MapPost("/activities", async (ClaimsPrincipal principal,
            TrackingService service, ActivityInput input, CancellationToken ct) =>
            await WithUser(principal, async id =>
            {
                var row = await service.CreateAsync(id, input, ct);
                return Results.Created($"/api/v1/activities/{row.Id}", row);
            }));

        api.MapPut("/activities/{id:guid}", async (Guid id, ClaimsPrincipal principal,
            TrackingService service, ActivityInput input, CancellationToken ct) =>
            await WithUser(principal, async actor =>
            {
                var row = await service.UpdateAsync(actor, id, input, ct);
                return row is null ? Results.NotFound() : Results.Ok(row);
            }));

        api.MapDelete("/activities/{id:guid}", async (Guid id,
            ClaimsPrincipal principal, TrackingService service, CancellationToken ct) =>
            await WithUser(principal, async actor =>
                await service.DeleteAsync(actor, id, ct) ?
                    Results.NoContent() : Results.NotFound()));

        api.MapGet("/activities", async (ClaimsPrincipal principal,
            TrackingService service, DateTimeOffset? from = null, DateTimeOffset? to = null,
            int page = 1, int pageSize = 20, CancellationToken ct = default) =>
            await WithUser(principal, async actor =>
                Results.Ok(await service.ListAsync(actor, from, to, page, pageSize, ct))));

        api.MapGet("/activities/daily", async (ClaimsPrincipal principal,
            TrackingService service, DateOnly? date, CancellationToken ct) =>
            await WithUser(principal, async actor =>
                Results.Ok(await service.GetDailySummaryAsync(actor, date, ct))));

        api.MapGet("/activities/summary", async (ClaimsPrincipal principal,
            TrackingService service, DateOnly? weekStart, CancellationToken ct) =>
            await WithUser(principal, async actor =>
                Results.Ok(await service.GetWeeklySummaryAsync(actor, weekStart, ct))));

        api.MapGet("/activities/goal", async (ClaimsPrincipal principal,
            TrackingService service, CancellationToken ct) =>
            await WithUser(principal, async actor =>
                Results.Ok(await service.GetGoalAsync(actor, ct))));

        api.MapPut("/activities/goal", async (ClaimsPrincipal principal,
            TrackingService service, GoalInput input, CancellationToken ct) =>
            await WithUser(principal, async actor =>
                Results.Ok(await service.SetGoalAsync(actor, input, ct))));

        api.MapGet("/ldas/latest", async (ClaimsPrincipal principal,
            TrackingService service, CancellationToken ct) =>
            await WithUser(principal, async actor =>
                Results.Ok(await service.GetLatestScoreAsync(actor, ct))));

        api.MapGet("/ldas/history", async (ClaimsPrincipal principal,
            TrackingService service, int page = 1, int pageSize = 20,
            CancellationToken ct = default) =>
            await WithUser(principal, async actor =>
                Results.Ok(await service.HistoryAsync(actor, page, pageSize, ct))));

        api.MapGet("/ldas/{date}", async (DateOnly date, ClaimsPrincipal principal,
            TrackingService service, CancellationToken ct) =>
            await WithUser(principal, async actor =>
                Results.Ok(await service.GetScoreAsync(actor, date, ct))));
    }

    internal static async Task<IResult> WithUser(
        ClaimsPrincipal principal, Func<Guid, Task<IResult>> operation)
    {
        if (!Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
            return Results.Unauthorized();
        try { return await operation(userId); }
        catch (TrackingInputException ex)
        {
            var status = ex.Code switch
            {
                "inactive_user" => StatusCodes.Status403Forbidden,
                "identity_unavailable" => StatusCodes.Status503ServiceUnavailable,
                "identity_contract_invalid" => StatusCodes.Status502BadGateway,
                _ => StatusCodes.Status400BadRequest,
            };
            return Results.Problem(statusCode: status, title: ex.Code, detail: ex.Message);
        }
    }
}
