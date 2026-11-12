using System.Security.Claims;
using System.Text.Json;
using LongevityDiet.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace LongevityDiet.Planning;

public static class PlanningChallengeEndpoints
{
    public static void MapPlanningChallengeEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/challenges/templates", async (PlanningDbContext db,
            CancellationToken ct) =>
        {
            var templates = await db.ChallengeTemplates.AsNoTracking()
                .Where(x => x.IsActive).OrderBy(x => x.Code)
                .Select(x => new { x.Id, x.Code, x.Title, x.Description,
                    x.DurationDays }).ToArrayAsync(ct);
            return Results.Ok(templates);
        });

        api.MapPost("/admin/challenge-templates", async (CreateChallengeTemplate input,
            PlanningDbContext db, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(input.Code) || input.Code.Trim().Length > 64 ||
                string.IsNullOrWhiteSpace(input.Title) || input.Title.Trim().Length > 200 ||
                input.Description?.Length > 1000 || input.DailyTitles is null ||
                input.DailyTitles.Length is < 7 or > 30 ||
                input.DailyTitles.Any(x => string.IsNullOrWhiteSpace(x) || x.Length > 200))
                return Results.BadRequest(new { error = "invalid_challenge_template" });
            var normalizedCode = input.Code.Trim().ToUpperInvariant();
            if (await db.ChallengeTemplates.AnyAsync(x => x.Code == normalizedCode, ct))
                return Results.Conflict(new { error = "duplicate_challenge_code" });
            var template = new ChallengeTemplate
            {
                Id = Guid.NewGuid(), Code = normalizedCode,
                Title = input.Title.Trim(), Description = input.Description?.Trim() ?? "",
                DurationDays = input.DailyTitles.Length, IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow
            };
            for (var i = 0; i < input.DailyTitles.Length; i++)
            {
                template.Days.Add(new ChallengeDayTemplate
                {
                    Id = Guid.NewGuid(), ChallengeTemplateId = template.Id,
                    DayNumber = i + 1, Title = input.DailyTitles[i].Trim(),
                    Guidance = "Refer to the approved program's guidance.",
                    ChallengeTemplate = template
                });
            }
            db.ChallengeTemplates.Add(template);
            try { await db.SaveChangesAsync(ct); }
            catch (DbUpdateException) { return Results.Conflict(new { error = "template_conflict" }); }
            return Results.Created("/api/v1/challenges/templates", new
            {
                template.Id, template.Code, template.Title, template.DurationDays
            });
        }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });

        api.MapGet("/challenges", async (ClaimsPrincipal principal, PlanningDbContext db,
            CancellationToken ct) =>
        {
            if (!Actor(principal, out var userId)) return Results.Unauthorized();
            var data = await db.UserChallenges.AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.StartedAt)
                .Select(x => new { x.Id, x.ChallengeTemplateId, x.StartDate, x.EndDate,
                    x.Status, x.CompletedAt }).ToArrayAsync(ct);
            return Results.Ok(data);
        });

        api.MapPost("/challenges", async (ClaimsPrincipal principal,
            StartChallengeInput input, PlanningDbContext db, CancellationToken ct) =>
        {
            if (!Actor(principal, out var userId)) return Results.Unauthorized();
            var zone = ParseTimeZone(input.TimeZone);
            if (zone is null) return Results.BadRequest(new { error = "invalid_time_zone" });
            var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(
                DateTimeOffset.UtcNow, zone).DateTime);
            if (input.StartDate.HasValue && input.StartDate.Value != today)
                return Results.BadRequest(new { error = "start_date_must_be_today" });
            if (await db.UserChallenges.AnyAsync(x => x.UserId == userId &&
                x.Status == UserChallengeStatus.Active, ct))
                return Results.Conflict(new { error = "active_challenge_exists" });
            var template = await db.ChallengeTemplates.AsNoTracking()
                .Include(x => x.Days).FirstOrDefaultAsync(
                    x => x.Id == input.TemplateId && x.IsActive, ct);
            if (template is null || template.Days.Count != template.DurationDays)
                return Results.NotFound();
            var now = DateTimeOffset.UtcNow;
            var challenge = new UserChallenge
            {
                Id = Guid.NewGuid(), UserId = userId,
                ChallengeTemplateId = template.Id, TimeZone = zone.Id,
                StartDate = today, EndDate = today.AddDays(template.DurationDays - 1),
                Status = UserChallengeStatus.Active, StartedAt = now, UpdatedAt = now
            };
            foreach (var day in template.Days.OrderBy(x => x.DayNumber))
            {
                challenge.Days.Add(new UserChallengeDay
                {
                    Id = Guid.NewGuid(), UserChallengeId = challenge.Id,
                    UserChallenge = challenge, DayNumber = day.DayNumber,
                    LocalDate = today.AddDays(day.DayNumber - 1), UpdatedAt = now
                });
            }
            db.UserChallenges.Add(challenge);
            RecordEvent(db, challenge, "ChallengeStarted.v1", null, now);
            try { await db.SaveChangesAsync(ct); }
            catch (DbUpdateException) { return Results.Conflict(new { error = "challenge_conflict" }); }
            return Results.Created($"/api/v1/challenges/{challenge.Id}", ToChallenge(challenge));
        });

        api.MapGet("/challenges/{challengeId:guid}", async (Guid challengeId,
            ClaimsPrincipal principal, PlanningDbContext db, CancellationToken ct) =>
        {
            if (!Actor(principal, out var userId)) return Results.Unauthorized();
            var challenge = await db.UserChallenges.AsNoTracking()
                .Include(x => x.Days).FirstOrDefaultAsync(
                    x => x.Id == challengeId && x.UserId == userId, ct);
            return challenge is null ? Results.NotFound() : Results.Ok(ToChallenge(challenge));
        });

        api.MapPost("/challenges/{challengeId:guid}/days/{dayNumber:int}/complete",
            async (Guid challengeId, int dayNumber, ClaimsPrincipal principal,
                PlanningDbContext db, CancellationToken ct) =>
        {
            if (!Actor(principal, out var userId)) return Results.Unauthorized();
            var challenge = await db.UserChallenges.Include(x => x.Days)
                .FirstOrDefaultAsync(x => x.Id == challengeId && x.UserId == userId, ct);
            if (challenge is null) return Results.NotFound();
            var day = challenge.Days.FirstOrDefault(x => x.DayNumber == dayNumber);
            if (day is null) return Results.NotFound();
            if (day.IsCompleted) return Results.Ok(ToChallenge(challenge));
            if (challenge.Status != UserChallengeStatus.Active)
                return Results.Conflict(new { error = "challenge_not_active" });
            var zone = ParseTimeZone(challenge.TimeZone);
            if (zone is null) return Results.Conflict(new { error = "invalid_saved_time_zone" });
            var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(
                DateTimeOffset.UtcNow, zone).DateTime);
            if (day.LocalDate > today)
                return Results.Conflict(new { error = "future_day_cannot_be_completed" });
            var now = DateTimeOffset.UtcNow;
            day.IsCompleted = true;
            day.CompletedAt = now;
            day.UpdatedAt = now;
            challenge.UpdatedAt = now;
            RecordEvent(db, challenge, "ChallengeDayCompleted.v1", day, now);
            if (challenge.Days.All(x => x.IsCompleted))
            {
                challenge.Status = UserChallengeStatus.Completed;
                challenge.CompletedAt = now;
                RecordEvent(db, challenge, "ChallengeCompleted.v1", null, now);
            }
            await db.SaveChangesAsync(ct);
            return Results.Ok(ToChallenge(challenge));
        });
    }

    private static bool Actor(ClaimsPrincipal principal, out Guid userId) =>
        Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out userId);

    private static TimeZoneInfo? ParseTimeZone(string? timeZone)
    {
        if (string.IsNullOrWhiteSpace(timeZone) || timeZone.Length > 100) return null;
        try { return TimeZoneInfo.FindSystemTimeZoneById(timeZone); }
        catch (TimeZoneNotFoundException) { return null; }
        catch (InvalidTimeZoneException) { return null; }
    }

    private static object ToChallenge(UserChallenge c) => new
    {
        c.Id, c.UserId, c.ChallengeTemplateId, status = c.Status.ToString(),
        c.TimeZone, c.StartDate, c.EndDate, c.StartedAt, c.CompletedAt,
        days = c.Days.OrderBy(x => x.DayNumber).Select(d => new
        {
            d.Id, d.DayNumber, d.LocalDate, d.IsCompleted, d.CompletedAt
        }).ToArray()
    };

    private static void RecordEvent(PlanningDbContext db, UserChallenge c,
        string eventType, UserChallengeDay? day, DateTimeOffset now)
    {
        var eventId = Guid.NewGuid();
        db.Outbox.Add(new PlanningOutboxEvent
        {
            Id = eventId, UserId = c.UserId, EventType = eventType,
            PayloadJson = JsonSerializer.Serialize(new
            {
                eventId, userId = c.UserId, challengeId = c.Id,
                dayNumber = day?.DayNumber, localDate = day?.LocalDate,
                eventType, occurredAtUtc = now, schemaVersion = 1
            }),
            CreatedAtUtc = now.UtcDateTime
        });
    }
}

public sealed record CreateChallengeTemplate(string? Code, string? Title,
    string? Description, string[]? DailyTitles);
public sealed record StartChallengeInput(Guid TemplateId, DateOnly? StartDate,
    string? TimeZone);
