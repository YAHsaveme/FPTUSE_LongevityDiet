using LongevityDiet.Repositories;
using LongevityDiet.Tracking;
using Microsoft.EntityFrameworkCore;

namespace LongevityDiet.API.Security;

/// <summary>
/// Current-runtime read-only contract adapter from the MealLog owner to LDAS.
/// Tracking owns its score database and never queries Identity/Catalog directly.
/// A dedicated async read model can replace this adapter when services are split.
/// </summary>
public sealed class MainDbTrackingDailySignalSource(LongevityDietDbContext owner)
    : ITrackingDailySignalSource
{
    public async Task<DailyMealWindowSignals> ReadAsync(
        Guid userId, DateOnly localDate, CancellationToken ct)
    {
        // Distinct slots prevent duplicate recordings of one meal from inflating
        // the logging-completeness indicator. No logs means NOT OBSERVED.
        var recordedSlots = await owner.MealLogs.AsNoTracking()
            .Where(x => x.UserId == userId && x.LocalDate == localDate && !x.IsDeleted)
            .Select(x => x.MealType).Distinct().CountAsync(ct);
        var preferredFrequency = await owner.UserProfiles.AsNoTracking()
            .Where(x => x.UserId == userId)
            .Select(x => x.PreferredMealFrequency)
            .SingleOrDefaultAsync(ct);

        decimal? mealPercent = recordedSlots > 0 && preferredFrequency > 0
            ? Math.Min(100m, Math.Round(recordedSlots * 100m / preferredFrequency,
                2, MidpointRounding.AwayFromZero))
            : null;

        // A one-meal/no-meal snapshot cannot establish an eating interval.
        // The canonical owner calculates the user's window/target and flags.
        var window = await owner.EatingWindowSnapshots.AsNoTracking()
            .Where(x => x.UserId == userId && x.LocalDate == localDate)
            .Select(x => new
            {
                x.CaloricMealCount, x.EatingWindowMinutes, x.IsWithinTargetWindow,
            }).SingleOrDefaultAsync(ct);
        decimal? windowPercent = window is not null &&
            window.CaloricMealCount >= 2 && window.EatingWindowMinutes.HasValue
            ? (window.IsWithinTargetWindow ? 100m : 0m) : null;

        return new DailyMealWindowSignals(mealPercent, windowPercent);
    }
}
