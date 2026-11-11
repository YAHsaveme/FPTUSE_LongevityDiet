using System.Security.Claims;
using System.Text.Json;
using LongevityDiet.Domain.Entities;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace LongevityDiet.Planning;

public static class PlanningOwnerEndpoints
{
    private static readonly HashSet<string> Patterns = new(StringComparer.OrdinalIgnoreCase)
        { "PlantForward", "Pescatarian", "StrictlyPlantBased" };

    public static void MapPlanningOwnerEndpoints(this RouteGroupBuilder api)
    {
        var plans = api.MapGroup("/meal-plans");
        plans.MapGet("/preferences", async (ClaimsPrincipal principal, PlanningDbContext db,
            CancellationToken ct) =>
        {
            if (!Actor(principal, out var userId)) return Results.Unauthorized();
            var saved = await db.UserDietaryPreferences.AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId, ct);
            return saved is null ? Results.NotFound() : Results.Ok(ToPreference(saved));
        });

        plans.MapPut("/preferences", async (ClaimsPrincipal principal, PreferenceInput input,
            PlanningDbContext db, CancellationToken ct) =>
        {
            if (!Actor(principal, out var userId)) return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(input.DietaryPattern) ||
                !Patterns.Contains(input.DietaryPattern) ||
                !ValidTokens(input.Allergies) || !ValidTokens(input.ExcludedFoods) ||
                input.PreferredCuisine?.Length > 120)
                return Results.BadRequest(new { error = "invalid_dietary_preference" });

            var pref = await db.UserDietaryPreferences.SingleOrDefaultAsync(
                x => x.UserId == userId, ct);
            if (pref is null)
            {
                pref = new UserDietaryPreference { UserId = userId };
                db.UserDietaryPreferences.Add(pref);
            }
            var now = DateTimeOffset.UtcNow;
            pref.DietaryPattern = Patterns.First(x => x.Equals(
                input.DietaryPattern, StringComparison.OrdinalIgnoreCase));
            pref.AllergiesCsv = Normalize(input.Allergies);
            pref.ExcludedFoodsCsv = Normalize(input.ExcludedFoods);
            pref.PreferredCuisine = string.IsNullOrWhiteSpace(input.PreferredCuisine)
                ? null : input.PreferredCuisine.Trim();
            pref.UpdatedAt = now;
            var eventId = Guid.NewGuid();
            db.Outbox.Add(new PlanningOutboxEvent
            {
                Id = eventId, UserId = userId,
                EventType = "DietaryPreferencesUpdated.v1",
                PayloadJson = JsonSerializer.Serialize(new
                {
                    eventId, userId, dietaryPattern = pref.DietaryPattern,
                    occurredAtUtc = now, schemaVersion = 1
                }),
                CreatedAtUtc = now.UtcDateTime
            });
            try { await db.SaveChangesAsync(ct); }
            catch (DbUpdateException) { return Results.Conflict(new { error = "write_conflict" }); }
            return Results.Ok(ToPreference(pref));
        });

        plans.MapGet("", async (ClaimsPrincipal principal, PlanningDbContext db,
            int page = 1, int pageSize = 20, CancellationToken ct = default) =>
        {
            if (!Actor(principal, out var userId)) return Results.Unauthorized();
            if (page < 1 || page > 100000 || pageSize is < 1 or > 100)
                return Results.BadRequest(new { error = "invalid_pagination" });
            var query = db.MealPlans.AsNoTracking().Where(x => x.UserId == userId);
            var total = await query.CountAsync(ct);
            var items = await query.OrderByDescending(x => x.GeneratedAt).ThenBy(x => x.Id)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .Select(x => new { x.Id, x.Status, x.StartDate, x.EndDate,
                    x.RuleSetVersion, x.RevisionNumber, x.GeneratedAt, x.UpdatedAt })
                .ToArrayAsync(ct);
            return Results.Ok(new { items, page, pageSize, totalItems = total });
        });

        plans.MapGet("/current", async (ClaimsPrincipal principal, PlanningDbContext db,
            CancellationToken ct) =>
        {
            if (!Actor(principal, out var userId)) return Results.Unauthorized();
            var plan = await db.MealPlans.AsNoTracking().Include(x => x.Days)
                .ThenInclude(x => x.Meals)
                .Where(x => x.UserId == userId && x.Status == MealPlanStatus.Active)
                .OrderByDescending(x => x.GeneratedAt).FirstOrDefaultAsync(ct);
            if (plan is null) return Results.NotFound();
            var pref = await db.UserDietaryPreferences.AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId, ct);
            if (pref is not null && !RestrictionsMatch(plan, pref))
                return Results.Conflict(new { error = "outdated_meal_plan_restrictions" });
            return Results.Ok(ToPlan(plan));
        });

        plans.MapGet("/{planId:guid}", async (Guid planId, ClaimsPrincipal principal,
            PlanningDbContext db, CancellationToken ct) =>
        {
            if (!Actor(principal, out var userId)) return Results.Unauthorized();
            var plan = await db.MealPlans.AsNoTracking().Include(x => x.Days)
                .ThenInclude(x => x.Meals).FirstOrDefaultAsync(
                    x => x.Id == planId && x.UserId == userId, ct);
            return plan is null ? Results.NotFound() : Results.Ok(ToPlan(plan));
        });
    }

    private static bool Actor(ClaimsPrincipal principal, out Guid userId) =>
        Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out userId);

    private static bool RestrictionsMatch(MealPlan plan, UserDietaryPreference pref)
    {
        if (!string.Equals(plan.DietaryPattern, pref.DietaryPattern,
            StringComparison.OrdinalIgnoreCase)) return false;
        return Split(pref.AllergiesCsv).IsSubsetOf(Split(plan.AppliedAllergiesCsv)) &&
            Split(pref.ExcludedFoodsCsv).IsSubsetOf(Split(plan.AppliedExclusionsCsv));
    }

    private static HashSet<string> Split(string text) =>
        text.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

    private static bool ValidTokens(string[]? tokens) => tokens is null ||
        (tokens.Length <= 30 && tokens.All(x =>
            !string.IsNullOrWhiteSpace(x) && x.Trim().Length <= 60 &&
            !x.Contains(',') && !x.Contains('\n') && !x.Contains('\r')));

    private static string Normalize(string[]? tokens) => string.Join(',',
        (tokens ?? []).Select(x => x.Trim().ToUpperInvariant())
            .Distinct(StringComparer.OrdinalIgnoreCase).Order(StringComparer.Ordinal));

    private static object ToPreference(UserDietaryPreference p) => new
    {
        p.UserId, p.DietaryPattern,
        allergies = Split(p.AllergiesCsv).Order().ToArray(),
        excludedFoods = Split(p.ExcludedFoodsCsv).Order().ToArray(),
        p.PreferredCuisine, p.UpdatedAt
    };

    private static object ToPlan(MealPlan p) => new
    {
        p.Id, p.UserId, p.RuleSetVersion, p.RevisionNumber, p.PreviousPlanId,
        status = p.Status.ToString(), p.StartDate, p.EndDate, p.MealsPerDay,
        p.TimeZone, p.DietaryPattern, p.AppliedAllergiesCsv,
        p.AppliedExclusionsCsv, p.ReasonCodesCsv, p.PlanExplanation,
        p.GeneratedAt, p.UpdatedAt,
        days = p.Days.OrderBy(x => x.DayNumber).Select(d => new
        {
            d.Id, d.DayNumber, d.PlanDate, d.TargetCaloriesKcal,
            d.DailyFocusCode, d.DailyFocusTitle,
            meals = d.Meals.OrderBy(m => m.SlotOrder).Select(m => new
            {
                m.Id, m.SlotOrder, slotType = m.SlotType.ToString(),
                m.PlannedTime, m.CandidateCode, m.Title, m.Description,
                m.CaloriesKcal, m.AllergensCsv, m.IngredientsCsv,
                m.ReasonCodesCsv, m.ExplanationSummary, m.RegenerationCount
            }).ToArray()
        }).ToArray()
    };
}

public sealed record PreferenceInput(string? DietaryPattern, string[]? Allergies,
    string[]? ExcludedFoods, string? PreferredCuisine);
