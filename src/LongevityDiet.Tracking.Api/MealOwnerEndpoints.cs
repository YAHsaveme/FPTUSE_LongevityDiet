using System.Security.Claims;
using Microsoft.AspNetCore.Routing;

namespace LongevityDiet.Tracking.Api;

public static class MealOwnerEndpoints
{
    public static void MapMealOwnerEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/meal-logs", async (ClaimsPrincipal actor,
            TrackingMealOwnerService service, DateOnly? fromDate, DateOnly? toDate,
            CancellationToken ct) =>
            await TrackingEndpoints.WithUser(actor, async id =>
                Results.Ok(await service.ListAsync(id, fromDate, toDate, ct))));

        api.MapPost("/meal-logs", async (ClaimsPrincipal actor,
            TrackingMealOwnerService service, MealLogInput input, CancellationToken ct) =>
            await TrackingEndpoints.WithUser(actor, async id =>
            {
                var created = await service.CreateAsync(id, input, ct);
                return Results.Json(created, statusCode: StatusCodes.Status201Created);
            }));

        api.MapPut("/meal-logs/{id:guid}", async (Guid id, ClaimsPrincipal actor,
            TrackingMealOwnerService service, MealLogInput input, CancellationToken ct) =>
            await TrackingEndpoints.WithUser(actor, async userId =>
            {
                var updated = await service.UpdateAsync(userId, id, input, ct);
                return updated is null ? Results.NotFound() : Results.Ok(updated);
            }));

        api.MapDelete("/meal-logs/{id:guid}", async (Guid id, ClaimsPrincipal actor,
            TrackingMealOwnerService service, CancellationToken ct) =>
            await TrackingEndpoints.WithUser(actor, async userId =>
                await service.DeleteAsync(userId, id, ct)
                    ? Results.NoContent() : Results.NotFound()));

        api.MapGet("/eating-window/summary", async (ClaimsPrincipal actor,
            TrackingMealOwnerService service, DateOnly? date, CancellationToken ct) =>
            await TrackingEndpoints.WithUser(actor, async userId =>
                Results.Ok(await service.GetWindowAsync(userId, date, ct))));

        api.MapGet("/eating-window/range", async (ClaimsPrincipal actor,
            TrackingMealOwnerService service, DateOnly? fromDate, DateOnly? toDate,
            CancellationToken ct) =>
            await TrackingEndpoints.WithUser(actor, async userId =>
                Results.Ok(await service.GetWindowRangeAsync(userId, fromDate, toDate, ct))));
    }
}
