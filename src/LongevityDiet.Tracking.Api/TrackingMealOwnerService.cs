using System.Text.Json;
using LongevityDiet.Domain.Entities;
using LongevityDiet.Tracking;
using Microsoft.EntityFrameworkCore;

namespace LongevityDiet.Tracking.Api;

// HTTP data is user-authored. Nutrient estimates are NOT certified by the Catalog
// or a clinician. PlannedMealId is only an opaque ID; no cross-service SQL FK.
public sealed record MealEntryInput(
    string? FoodCode, string? FoodName, decimal ServingAmount,
    string? ServingUnit, int CaloriesKcal, decimal ProteinGrams,
    decimal CarbsGrams, decimal FatGrams, decimal FiberGrams, bool IsPlantBased);

public sealed record MealLogInput(
    DateTimeOffset EatenAt, string? MealType, string? Title,
    Guid? PlannedMealId, string? Notes, MealEntryInput[]? Items);

public sealed class TrackingMealOwnerService(
    TrackingDbContext db,
    IdentityHttpTrackingUserContext identity,
    TimeProvider clock)
{
    public async Task<object> CreateAsync(Guid userId, MealLogInput input, CancellationToken ct)
    {
        var profile = await RequiredProfile(userId, ct);
        var type = Validate(input);
        var now = clock.GetUtcNow();
        var row = new MealLog
        {
            Id = Guid.NewGuid(), UserId = userId, EatenAt = input.EatenAt,
            LocalDate = ToLocalDate(input.EatenAt, profile.TimeZone),
            TimeZone = profile.TimeZone,
            PlannedMealId = input.PlannedMealId, MealType = type,
            Title = input.Title!.Trim(), Notes = input.Notes?.Trim(),
            CreatedAt = now, UpdatedAt = now
        };
        FillItems(row, input.Items!);
        db.MealLogs.Add(row);
        QueueEvent(row, "created", now);
        var strategy = db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            await db.SaveChangesAsync(ct);
            await RecalculateAsync(userId, row.LocalDate, profile, ct);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        });
        return View(row);
    }

    public async Task<object?> UpdateAsync(Guid userId, Guid logId, MealLogInput input,
        CancellationToken ct)
    {
        var profile = await RequiredProfile(userId, ct);
        var row = await db.MealLogs.Include(x => x.Items)
            .SingleOrDefaultAsync(x => x.Id == logId && x.UserId == userId && !x.IsDeleted, ct);
        if (row is null) return null;
        var type = Validate(input);
        var oldDate = row.LocalDate;
        row.EatenAt = input.EatenAt;
        row.TimeZone = profile.TimeZone;
        row.LocalDate = ToLocalDate(input.EatenAt, profile.TimeZone);
        row.PlannedMealId = input.PlannedMealId;
        row.MealType = type;
        row.Title = input.Title!.Trim();
        row.Notes = input.Notes?.Trim();
        var now = clock.GetUtcNow();
        row.UpdatedAt = now;
        var previousItems = row.Items.ToArray();
        db.MealLogItems.RemoveRange(previousItems);
        // Replace the navigation collection rather than clearing tracked
        // deleted rows: EF must INSERT new items, never UPDATE deleted IDs.
        row.Items = new List<MealLogItem>();
        FillItems(row, input.Items!);
        // Explicit Added is essential for newly keyed children attached to an
        // existing tracked aggregate; otherwise EF emits UPDATE instead of INSERT.
        foreach (var replacement in row.Items)
            db.Entry(replacement).State = EntityState.Added;
        QueueEvent(row, "updated", now);
        var strategy = db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            await db.SaveChangesAsync(ct);
            await RecalculateAsync(userId, oldDate, profile, ct);
            if (oldDate != row.LocalDate)
                await RecalculateAsync(userId, row.LocalDate, profile, ct);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        });
        return View(row);
    }

    public async Task<bool> DeleteAsync(Guid userId, Guid logId, CancellationToken ct)
    {
        var profile = await RequiredProfile(userId, ct);
        var row = await db.MealLogs.SingleOrDefaultAsync(
            x => x.Id == logId && x.UserId == userId && !x.IsDeleted, ct);
        if (row is null) return false;
        var now = clock.GetUtcNow();
        row.IsDeleted = true;
        row.DeletedAt = now;
        row.UpdatedAt = now;
        QueueEvent(row, "deleted", now);
        var strategy = db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            await db.SaveChangesAsync(ct);
            await RecalculateAsync(userId, row.LocalDate, profile, ct);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        });
        return true;
    }

    public async Task<IReadOnlyList<object>> ListAsync(
        Guid userId, DateOnly? fromDate, DateOnly? toDate, CancellationToken ct)
    {
        var profile = await RequiredProfile(userId, ct);
        var today = ToLocalDate(clock.GetUtcNow(), profile.TimeZone);
        var first = fromDate ?? today.AddDays(-6);
        var last = toDate ?? today;
        if (last < first || last.DayNumber - first.DayNumber > 90)
            throw new TrackingInputException("invalid_date_range", "Date range must be 0–90 days.");
        var rows = await db.MealLogs.AsNoTracking().Include(x => x.Items)
            .Where(x => x.UserId == userId && !x.IsDeleted &&
                x.LocalDate >= first && x.LocalDate <= last)
            .OrderByDescending(x => x.EatenAt).Take(2000).ToArrayAsync(ct);
        return rows.Select(View).ToArray();
    }

    public async Task<object> GetWindowAsync(
        Guid userId, DateOnly? date, CancellationToken ct)
    {
        var profile = await RequiredProfile(userId, ct);
        var local = date ?? ToLocalDate(clock.GetUtcNow(), profile.TimeZone);
        var persisted = await db.EatingWindowSnapshots.AsNoTracking()
            .SingleOrDefaultAsync(x => x.UserId == userId && x.LocalDate == local, ct);
        return WindowView(persisted ?? EmptyWindow(userId, local, profile));
    }

    public async Task<IReadOnlyList<object>> GetWindowRangeAsync(
        Guid userId, DateOnly? from, DateOnly? to, CancellationToken ct)
    {
        var profile = await RequiredProfile(userId, ct);
        var today = ToLocalDate(clock.GetUtcNow(), profile.TimeZone);
        var start = from ?? today.AddDays(-6);
        var end = to ?? today;
        if (start > end || end.DayNumber - start.DayNumber > 90)
            throw new TrackingInputException("invalid_date_range", "Date range must be 0–90 days.");
        var saved = await db.EatingWindowSnapshots.AsNoTracking()
            .Where(x => x.UserId == userId && x.LocalDate >= start && x.LocalDate <= end)
            .ToDictionaryAsync(x => x.LocalDate, ct);
        var list = new List<object>();
        for (var day = start; day <= end; day = day.AddDays(1))
            list.Add(WindowView(saved.TryGetValue(day, out var x) ?
                x : EmptyWindow(userId, day, profile)));
        return list;
    }

    private async Task<IdentityTrackingProfile> RequiredProfile(Guid userId, CancellationToken ct) =>
        await identity.GetProfileAsync(userId, ct) ??
        throw new TrackingInputException("inactive_user", "An active Identity account is required.");

    private MealSlotType Validate(MealLogInput input)
    {
        if (!Enum.TryParse<MealSlotType>(input.MealType, true, out var type) ||
            !Enum.IsDefined(type))
            throw new TrackingInputException("invalid_meal_type", "Choose a supported meal type.");
        if (string.IsNullOrWhiteSpace(input.Title) || input.Title.Trim().Length > 200 ||
            input.Notes?.Length > 1000 || input.Items is null ||
            input.Items.Length is < 1 or > 20)
            throw new TrackingInputException("invalid_meal_log", "Invalid title, notes or item count.");
        var now = clock.GetUtcNow();
        if (input.EatenAt > now.AddDays(1) || input.EatenAt < now.AddDays(-366))
            throw new TrackingInputException("invalid_eaten_at", "Meal timestamp is outside the supported period.");
        foreach (var item in input.Items)
        {
            if (string.IsNullOrWhiteSpace(item.FoodName) || item.FoodName.Length > 200 ||
                item.FoodCode?.Length > 80 || string.IsNullOrWhiteSpace(item.ServingUnit) ||
                item.ServingUnit.Length > 64 || item.ServingAmount is <= 0 or > 1000 ||
                item.CaloriesKcal is < 0 or > 5000 ||
                item.ProteinGrams is < 0 or > 5000 ||
                item.CarbsGrams is < 0 or > 5000 ||
                item.FatGrams is < 0 or > 5000 ||
                item.FiberGrams is < 0 or > 5000)
                throw new TrackingInputException("invalid_meal_item", "Meal item violates numeric or text limits.");
        }
        return type;
    }

    private static void FillItems(MealLog meal, IEnumerable<MealEntryInput> entries)
    {
        foreach (var item in entries)
            meal.Items.Add(new MealLogItem
            {
                Id = Guid.NewGuid(), MealLogId = meal.Id, MealLog = meal,
                FoodCode = item.FoodCode?.Trim(),
                FoodName = item.FoodName!.Trim(),
                ServingAmount = item.ServingAmount,
                ServingUnit = item.ServingUnit!.Trim(),
                CaloriesKcal = item.CaloriesKcal,
                ProteinGrams = item.ProteinGrams,
                CarbsGrams = item.CarbsGrams,
                FatGrams = item.FatGrams,
                FiberGrams = item.FiberGrams,
                IsPlantBased = item.IsPlantBased
            });
        meal.TotalCaloriesKcal = meal.Items.Sum(x => x.CaloriesKcal);
        meal.TotalProteinGrams = meal.Items.Sum(x => x.ProteinGrams);
        meal.TotalCarbsGrams = meal.Items.Sum(x => x.CarbsGrams);
        meal.TotalFatGrams = meal.Items.Sum(x => x.FatGrams);
        meal.TotalFiberGrams = meal.Items.Sum(x => x.FiberGrams);
    }

    private static DateOnly ToLocalDate(DateTimeOffset at, string zone) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(at,
            TimeZoneInfo.FindSystemTimeZoneById(zone)).DateTime);

    private void QueueEvent(MealLog row, string operation, DateTimeOffset now)
    {
        var eventId = Guid.NewGuid();
        db.Outbox.Add(new TrackingOutboxEvent
        {
            EventId = eventId, UserId = row.UserId, EventType = "MealLogChanged.v1",
            PayloadJson = JsonSerializer.Serialize(new
            {
                eventId, userId = row.UserId, mealLogId = row.Id,
                operation, localDate = row.LocalDate,
                schemaVersion = 1, occurredAtUtc = now
            }),
            CreatedAtUtc = now.UtcDateTime
        });
    }

    private async Task RecalculateAsync(Guid userId, DateOnly local,
        IdentityTrackingProfile profile, CancellationToken ct)
    {
        var rows = await db.MealLogs.AsNoTracking().Where(x =>
            x.UserId == userId && x.LocalDate == local && !x.IsDeleted)
            .OrderBy(x => x.EatenAt).ToArrayAsync(ct);
        var caloric = rows.Where(x => x.TotalCaloriesKcal > 0).ToArray();
        var window = await db.EatingWindowSnapshots.SingleOrDefaultAsync(
            x => x.UserId == userId && x.LocalDate == local, ct);
        if (window is null)
        {
            window = new EatingWindowSnapshot
                { Id = Guid.NewGuid(), UserId = userId, LocalDate = local };
            db.EatingWindowSnapshots.Add(window);
        }
        window.TimeZone = profile.TimeZone;
        window.LoggedMealCount = rows.Length;
        window.CaloricMealCount = caloric.Length;
        window.TotalCaloriesKcal = rows.Sum(x => x.TotalCaloriesKcal);
        window.FirstMealAt = caloric.FirstOrDefault()?.EatenAt;
        window.LastMealAt = caloric.LastOrDefault()?.EatenAt;
        var zone = TimeZoneInfo.FindSystemTimeZoneById(profile.TimeZone);
        window.FirstMealLocalTime = window.FirstMealAt is { } first ?
            TimeOnly.FromDateTime(TimeZoneInfo.ConvertTime(first, zone).DateTime) : null;
        window.LastMealLocalTime = window.LastMealAt is { } last ?
            TimeOnly.FromDateTime(TimeZoneInfo.ConvertTime(last, zone).DateTime) : null;
        window.EatingWindowMinutes = window.FirstMealAt.HasValue && window.LastMealAt.HasValue ?
            Math.Max(0, (int)Math.Round((window.LastMealAt.Value -
                window.FirstMealAt.Value).TotalMinutes, MidpointRounding.AwayFromZero)) : null;
        window.TargetWindowMinutes = 720;
        // A missing eating-window observation is unknown, not a violation.
        window.IsWithinTargetWindow = !window.EatingWindowMinutes.HasValue ||
            window.EatingWindowMinutes.Value <= window.TargetWindowMinutes;
        window.ConfiguredSleepTime = profile.SleepTime;
        window.MinutesBeforeBedtime = profile.SleepTime is { } sleep &&
            window.LastMealLocalTime is { } lastLocal ?
            MinutesBeforeBed(lastLocal, profile.WakeTime, sleep) : null;
        window.IsLateEatingFlagged = window.MinutesBeforeBedtime is < 180;
        window.StatusCode = caloric.Length == 0 ? "NoMeals" :
            !window.IsWithinTargetWindow && window.IsLateEatingFlagged ? "WindowExceededAndLateEating" :
            !window.IsWithinTargetWindow ? "WindowExceeded" :
            window.IsLateEatingFlagged ? "LateEating" :
            caloric.Length == 1 ? "SingleMeal" : "OnTrack";
        window.SummaryMessage = caloric.Length == 0 ?
            "No caloric meal has been logged for this day." :
            "Self-reported eating window; educational estimate, not clinical advice.";
        window.CalculatedAt = clock.GetUtcNow();

        // Missing observations remain missing, never silently mapped to zero.
        // Meal completion is relative to the member's own meal-frequency setting.
        var mealPercent = caloric.Length > 0 ?
            Math.Min(100m, caloric.Length * 100m / profile.PreferredMealFrequency) : (decimal?)null;
        // A single meal cannot establish the length of an eating window.
        var windowPercent = caloric.Length >= 2 ?
            (window.IsWithinTargetWindow ? 100m : 0m) : (decimal?)null;
        await UpdateSignal(userId, local, "meals", mealPercent, ct);
        await UpdateSignal(userId, local, "eating_window", windowPercent, ct);
    }

    private async Task UpdateSignal(Guid userId, DateOnly local, string dimension,
        decimal? value, CancellationToken ct)
    {
        var row = await db.ScoreSignals.SingleOrDefaultAsync(
            x => x.UserId == userId && x.LocalDate == local &&
                x.DimensionCode == dimension, ct);
        if (value is null)
        {
            if (row is not null) db.ScoreSignals.Remove(row);
            return;
        }
        if (row is null)
        {
            row = new TrackingScoreSignal
            {
                Id = Guid.NewGuid(), UserId = userId, LocalDate = local,
                DimensionCode = dimension
            };
            db.ScoreSignals.Add(row);
        }
        row.Percent = Math.Round(value.Value, 2);
        row.SourceEventId = Guid.NewGuid();
        row.SourceVersion = "tracking-owned-meal-log-v1";
        row.ReceivedAtUtc = clock.GetUtcNow();
    }

    private static int MinutesBeforeBed(TimeOnly lastMeal,
        TimeOnly? wakeTime, TimeOnly bedtime)
    {
        var wakeMinutes = (wakeTime?.Hour ?? 6) * 60 + (wakeTime?.Minute ?? 0);
        var sleepMinutes = bedtime.Hour * 60 + bedtime.Minute;
        var mealMinutes = lastMeal.Hour * 60 + lastMeal.Minute;
        if (sleepMinutes < wakeMinutes || bedtime.Hour < 4)
        {
            sleepMinutes += 1440;
            if (mealMinutes < wakeMinutes) mealMinutes += 1440;
        }
        return sleepMinutes - mealMinutes;
    }

    private EatingWindowSnapshot EmptyWindow(Guid userId, DateOnly local,
        IdentityTrackingProfile profile) => new()
        {
            UserId = userId, LocalDate = local, TimeZone = profile.TimeZone,
            StatusCode = "NoMeals", SummaryMessage = "No meals reported for this day.",
            TargetWindowMinutes = 720, IsWithinTargetWindow = true,
            ConfiguredSleepTime = profile.SleepTime, CalculatedAt = clock.GetUtcNow()
        };

    private static object WindowView(EatingWindowSnapshot x) => new
    {
        x.UserId, x.LocalDate, x.TimeZone, x.LoggedMealCount, x.CaloricMealCount,
        x.TotalCaloriesKcal, x.FirstMealAt, x.LastMealAt,
        x.FirstMealLocalTime, x.LastMealLocalTime, x.EatingWindowMinutes,
        x.TargetWindowMinutes, x.IsWithinTargetWindow, x.ConfiguredSleepTime,
        x.MinutesBeforeBedtime, x.IsLateEatingFlagged,
        x.StatusCode, x.SummaryMessage, x.CalculatedAt
    };

    private static object View(MealLog x) => new
    {
        x.Id, x.UserId, x.PlannedMealId, x.EatenAt, x.LocalDate,
        x.TimeZone, mealType = x.MealType.ToString(), x.Title, x.Notes,
        x.TotalCaloriesKcal, x.TotalProteinGrams, x.TotalCarbsGrams,
        x.TotalFatGrams, x.TotalFiberGrams, x.CreatedAt, x.UpdatedAt,
        items = x.Items.Select(y => new
        {
            y.Id, y.FoodCode, y.FoodName, y.ServingAmount, y.ServingUnit,
            y.CaloriesKcal, y.ProteinGrams, y.CarbsGrams, y.FatGrams,
            y.FiberGrams, y.IsPlantBased
        }).ToArray()
    };
}
