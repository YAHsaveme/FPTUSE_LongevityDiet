using System.Text.Json;
using LongevityDiet.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LongevityDiet.Recommendation.Grpc.Ownership;

public static class RecommendationOwnerEndpoints
{
    public static void MapRecommendationOwnerEndpoints(this RouteGroupBuilder api)
    {
        var feedback = api.MapGroup("/recommendations/feedback");
        feedback.MapGet("", async (RecommendationActorVerifier actor,
            RecommendationDbContext db, CancellationToken ct) =>
            await Verified(actor, ct, async userId =>
            {
                var data = await db.Feedback.AsNoTracking()
                    .Where(x => x.UserId == userId)
                    .OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id)
                    .Take(100).ToArrayAsync(ct);
                return Results.Ok(data.Select(FeedbackView).ToArray());
            }));

        feedback.MapPost("", async (RecommendationActorVerifier actor,
            RecommendationDbContext db, FeedbackInput input, CancellationToken ct) =>
            await Verified(actor, ct, async userId =>
            {
                if (input.RequestId == Guid.Empty ||
                    !ValidCode(input.CandidateCode, 80) ||
                    string.IsNullOrWhiteSpace(input.CandidateTitle) ||
                    input.CandidateTitle.Trim().Length > 200 ||
                    !Enum.TryParse<RecommendationFeedbackType>(input.FeedbackType,
                        true, out var kind) ||
                    !Enum.IsDefined(kind) ||
                    !ValidCode(input.ReasonCode, 80) ||
                    input.Notes?.Length > 600 ||
                    !ValidCode(input.RuleSetVersion, 64) ||
                    !ValidCode(input.WeightProfileVersion, 64))
                    return Results.BadRequest(new { error = "invalid_feedback" });

                // Client-generated immutable GUID is the idempotency key.
                var original = await db.Feedback.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == input.RequestId, ct);
                if (original is not null)
                    return original.UserId == userId &&
                        string.Equals(original.CandidateCode, input.CandidateCode,
                            StringComparison.OrdinalIgnoreCase) &&
                        original.FeedbackType == kind
                        ? Results.Ok(FeedbackView(original))
                        : Results.Conflict(new { error = "request_id_conflict" });

                var now = DateTimeOffset.UtcNow;
                var value = new RecommendationFeedback
                {
                    Id = input.RequestId, UserId = userId,
                    CandidateCode = input.CandidateCode!.Trim().ToUpperInvariant(),
                    CandidateTitle = input.CandidateTitle!.Trim(),
                    FeedbackType = kind, ReasonCode = input.ReasonCode!.Trim(),
                    Notes = string.IsNullOrWhiteSpace(input.Notes) ? null : input.Notes.Trim(),
                    RuleSetVersion = input.RuleSetVersion!.Trim(),
                    WeightProfileVersion = input.WeightProfileVersion!.Trim(),
                    PlannedMealId = input.PlannedMealId, CreatedAt = now
                };
                db.Feedback.Add(value);
                Queue(db, userId, "RecommendationFeedbackSubmitted.v1",
                    new { feedbackId = value.Id, candidateCode = value.CandidateCode,
                        feedbackType = kind.ToString(), schemaVersion = 1 }, now);
                try { await db.SaveChangesAsync(ct); }
                catch (DbUpdateException)
                {
                    return Results.Conflict(new { error = "request_id_conflict" });
                }
                return Results.Json(FeedbackView(value), statusCode: StatusCodes.Status201Created);
            }));

        var preferences = api.MapGroup("/recommendations/food-preferences");
        preferences.MapGet("", async (RecommendationActorVerifier actor,
            RecommendationDbContext db, CancellationToken ct) =>
            await Verified(actor, ct, async userId =>
            {
                var data = await db.FoodPreferences.AsNoTracking()
                    .Where(x => x.UserId == userId).OrderBy(x => x.FoodToken)
                    .Take(100).ToArrayAsync(ct);
                return Results.Ok(data.Select(PreferenceView).ToArray());
            }));

        preferences.MapPut("/{foodToken}", async (string foodToken,
            RecommendationActorVerifier actor, RecommendationDbContext db,
            PreferenceInput input, CancellationToken ct) =>
            await Verified(actor, ct, async userId =>
            {
                if (!ValidFoodToken(foodToken) ||
                    string.IsNullOrWhiteSpace(input.DisplayLabel) ||
                    input.DisplayLabel.Trim().Length > 200 ||
                    input.Notes?.Length > 500 ||
                    !Enum.TryParse<FoodPreferenceKind>(input.PreferenceKind, true, out var kind) ||
                    !Enum.IsDefined(kind))
                    return Results.BadRequest(new { error = "invalid_food_preference" });
                var key = foodToken.Trim().ToUpperInvariant();
                var existing = await db.FoodPreferences.FirstOrDefaultAsync(
                    x => x.UserId == userId && x.FoodToken == key, ct);
                if (existing is null)
                {
                    existing = new UserFoodPreference
                    {
                        Id = Guid.NewGuid(), UserId = userId, FoodToken = key
                    };
                    db.FoodPreferences.Add(existing);
                }
                var now = DateTimeOffset.UtcNow;
                existing.DisplayLabel = input.DisplayLabel!.Trim();
                existing.PreferenceKind = kind;
                existing.Notes = string.IsNullOrWhiteSpace(input.Notes) ? null : input.Notes.Trim();
                existing.Source = "UserSetting";
                existing.UpdatedAt = now;
                Queue(db, userId, "UserFoodPreferenceChanged.v1",
                    new { foodToken = key, preferenceKind = kind.ToString(),
                        operation = "upsert", schemaVersion = 1 }, now);
                try { await db.SaveChangesAsync(ct); }
                catch (DbUpdateException)
                {
                    return Results.Conflict(new { error = "preference_concurrent_write" });
                }
                return Results.Ok(PreferenceView(existing));
            }));

        preferences.MapDelete("/{foodToken}", async (string foodToken,
            RecommendationActorVerifier actor, RecommendationDbContext db,
            CancellationToken ct) =>
            await Verified(actor, ct, async userId =>
            {
                if (!ValidFoodToken(foodToken))
                    return Results.BadRequest(new { error = "invalid_food_token" });
                var key = foodToken.Trim().ToUpperInvariant();
                var entry = await db.FoodPreferences.FirstOrDefaultAsync(
                    x => x.UserId == userId && x.FoodToken == key, ct);
                if (entry is null) return Results.NotFound();
                db.FoodPreferences.Remove(entry);
                Queue(db, userId, "UserFoodPreferenceChanged.v1",
                    new { foodToken = key, operation = "deleted", schemaVersion = 1 },
                    DateTimeOffset.UtcNow);
                await db.SaveChangesAsync(ct);
                return Results.NoContent();
            }));
    }

    // Feedback/Dislike never creates an ExplicitExclusion automatically.
    private static bool ValidFoodToken(string? token) => ValidCode(token, 120) &&
        token!.All(c => char.IsAsciiLetterOrDigit(c) || c is '-' or '_' or '.');
    private static bool ValidCode(string? value, int max) =>
        !string.IsNullOrWhiteSpace(value) && value.Trim().Length <= max;

    [System.Diagnostics.CodeAnalysis.SuppressMessage("Design", "CA1068",
        Justification = "Private wrapper keeps the cancellation token beside actor verification.")]
    private static async Task<IResult> Verified(
        RecommendationActorVerifier actor, CancellationToken ct,
        Func<Guid, Task<IResult>> action)
    {
        try { return await action(await actor.VerifyAsync(ct)); }
        catch (RecommendationOwnerException ex)
        {
            return Results.Problem(statusCode: ex.HttpStatus, title: ex.Code);
        }
    }

    private static void Queue(RecommendationDbContext db, Guid userId, string kind,
        object payload, DateTimeOffset now)
    {
        var eventId = Guid.NewGuid();
        db.Outbox.Add(new RecommendationOutbox
        {
            EventId = eventId, UserId = userId, EventType = kind,
            PayloadJson = JsonSerializer.Serialize(new
            {
                eventId, userId, eventType = kind, payload, occurredAtUtc = now
            }),
            CreatedAtUtc = now.UtcDateTime
        });
    }

    private static object FeedbackView(RecommendationFeedback x) => new
    {
        x.Id, x.UserId, x.CandidateCode, x.CandidateTitle, x.PlannedMealId,
        feedbackType = x.FeedbackType.ToString(), x.ReasonCode, x.Notes,
        x.RuleSetVersion, x.WeightProfileVersion, x.CreatedAt
    };

    private static object PreferenceView(UserFoodPreference x) => new
    {
        x.Id, x.UserId, x.FoodToken, x.DisplayLabel,
        preferenceKind = x.PreferenceKind.ToString(), x.Source, x.Notes, x.UpdatedAt
    };
}

public sealed record FeedbackInput(Guid RequestId, string? CandidateCode,
    string? CandidateTitle, string? FeedbackType, string? ReasonCode,
    string? Notes, Guid? PlannedMealId, string? RuleSetVersion,
    string? WeightProfileVersion);

public sealed record PreferenceInput(string? DisplayLabel,
    string? PreferenceKind, string? Notes);
