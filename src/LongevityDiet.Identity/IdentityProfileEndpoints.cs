using System.Security.Claims;
using System.Text.Json;
using LongevityDiet.Domain.Entities;
using LongevityDiet.Services.Reminders;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace LongevityDiet.Identity;

public static class IdentityProfileEndpoints
{
    public static void MapProfileOwnerEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/profile", async (ClaimsPrincipal principal,
            IdentityDbContext db, CancellationToken ct) =>
        {
            if (!Actor(principal, out var id)) return Results.Unauthorized();
            var user = await db.Users.AsNoTracking().Include(u => u.Profile)
                .FirstOrDefaultAsync(u => u.Id == id && u.Status == AccountStatus.Active, ct);
            return user is null ? Results.NotFound() : Results.Ok(ToProfile(user));
        });

        api.MapPut("/profile", async (ClaimsPrincipal principal, UpdateIdentityProfile input,
            IdentityDbContext db, CancellationToken ct) =>
        {
            if (!Actor(principal, out var id)) return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(input.DisplayName) ||
                input.DisplayName.Trim().Length is < 2 or > 120 ||
                input.BirthYear is < 1900 ||
                input.BirthYear > DateTimeOffset.UtcNow.Year ||
                input.PreferredMealFrequency is < 2 or > 4 ||
                string.IsNullOrWhiteSpace(input.TimeZone) ||
                input.TimeZone.Length > 100 ||
                input.FoodPreference?.Length > 500 ||
                !ValidTimeZone(input.TimeZone))
                return Results.BadRequest(new { error = "invalid_profile" });

            var user = await db.Users.Include(u => u.Profile)
                .FirstOrDefaultAsync(u => u.Id == id && u.Status == AccountStatus.Active, ct);
            if (user is null) return Results.NotFound();
            var now = DateTimeOffset.UtcNow;
            var priorZone = user.Profile?.TimeZone ?? "Asia/Ho_Chi_Minh";
            user.DisplayName = input.DisplayName.Trim();
            user.UpdatedAt = now;
            user.Profile ??= new UserProfile { UserId = user.Id, User = user };
            user.Profile.BirthYear = input.BirthYear;
            user.Profile.TimeZone = input.TimeZone.Trim();
            user.Profile.WakeTime = input.WakeTime;
            user.Profile.SleepTime = input.SleepTime;
            user.Profile.PreferredMealFrequency = input.PreferredMealFrequency;
            user.Profile.FoodPreference = string.IsNullOrWhiteSpace(input.FoodPreference)
                ? null : input.FoodPreference.Trim();
            user.Profile.ProfileCompleted = input.BirthYear.HasValue &&
                input.WakeTime.HasValue && input.SleepTime.HasValue;
            user.Profile.UpdatedAt = now;

            // Persist versioned read-model signal in the same owned SQL commit.
            // Never include name, email or questionnaire answers in this event.
            var eventId = Guid.NewGuid();
            db.IdentityOutbox.Add(new IdentityOutboxEvent
            {
                Id = eventId, UserId = id, EventType = "UserProfileUpdated.v1",
                PayloadJson = JsonSerializer.Serialize(new {
                    eventId, userId = id, timeZone = user.Profile.TimeZone,
                    profileCompleted = user.Profile.ProfileCompleted,
                    version = 1, occurredAtUtc = now }),
                CreatedAtUtc = now.UtcDateTime
            });
            if (!string.Equals(priorZone, user.Profile.TimeZone, StringComparison.Ordinal))
            {
                var reminder = await db.ReminderPreferences
                    .SingleOrDefaultAsync(x => x.UserId == id, ct);
                if (reminder is not null)
                {
                    reminder.Version++;
                    reminder.UpdatedAtUtc = now;
                    db.IdentityOutbox.Add(ReminderPreferenceEventFactory.Create(
                        id, user.Profile.TimeZone, true, reminder, now));
                }
            }
            await db.SaveChangesAsync(ct);
            return Results.Ok(ToProfile(user));
        });
    }

    private static bool Actor(ClaimsPrincipal principal, out Guid id) =>
        Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out id);

    private static bool ValidTimeZone(string zone)
    {
        try { _ = TimeZoneInfo.FindSystemTimeZoneById(zone); return true; }
        catch (TimeZoneNotFoundException) { return false; }
        catch (InvalidTimeZoneException) { return false; }
    }

    private static object ToProfile(User user)
    {
        var p = user.Profile ?? new UserProfile
        {
            UserId = user.Id, TimeZone = "Asia/Ho_Chi_Minh", PreferredMealFrequency = 3
        };
        return new
        {
            userId = user.Id, user.Email, user.DisplayName, p.BirthYear,
            p.TimeZone, p.WakeTime, p.SleepTime,
            p.PreferredMealFrequency, p.FoodPreference, p.ProfileCompleted
        };
    }
}

public sealed record UpdateIdentityProfile(
    string? DisplayName, int? BirthYear, string? TimeZone,
    TimeOnly? WakeTime, TimeOnly? SleepTime,
    int PreferredMealFrequency, string? FoodPreference);
