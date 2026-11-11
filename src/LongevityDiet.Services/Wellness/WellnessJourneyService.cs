using LongevityDiet.Domain.Entities;
using LongevityDiet.Repositories.Repositories;
using LongevityDiet.Services.Identity;
using LongevityDiet.Services.Planning;

namespace LongevityDiet.Services.Wellness;

public sealed record ScreeningCommand(
    IReadOnlyList<string> RiskFlags, bool AllergiesReviewed, IReadOnlyList<string> Allergies);

public sealed record CheckInCommand(
    DateOnly LocalDate, string Phase, int Energy, int Mood, int Digestion,
    int SleepQuality, IReadOnlyList<string> Symptoms, IReadOnlyList<string> BodyChanges,
    decimal? WeightKg, string? Notes);

public sealed record CheckInView(
    Guid Id, DateOnly LocalDate, string Phase, int Energy, int Mood, int Digestion,
    int SleepQuality, IReadOnlyList<string> Symptoms, IReadOnlyList<string> BodyChanges,
    decimal? WeightKg, string? Notes, DateTimeOffset RecordedAt, bool UrgentHelpRecommended);

public sealed record WellnessTrendSnapshot(
    int DaysReported, int DaysDuring, decimal? AverageEnergyDuring,
    decimal? AverageMoodDuring, decimal? AverageDigestionDuring,
    decimal? AverageSleepDuring, int? BaselineEnergy, int? LatestEnergy,
    decimal? EnergyChangeFromBaseline, decimal? WeightChangeFromBaselineKg,
    bool RepeatedLowWellbeing);

public sealed record WellnessOverview(
    DateOnly Today, string TimeZone, string Segment, bool RequiresProfessionalReview,
    bool ScreeningComplete, bool DailyCheckInDue, bool UrgentHelpRecommended,
    IReadOnlyList<string> RiskFlags, IReadOnlyList<string> Allergies, string Guidance,
    IReadOnlyList<CheckInView> RecentCheckIns, WellnessTrendSnapshot Trend);

public sealed class WellnessJourneyService(
    IWellnessRepository repository,
    IMealPlanRepository mealPlanRepository,
    TimeProvider clock)
{
    private static readonly HashSet<string> AllowedPhases = new(StringComparer.OrdinalIgnoreCase)
    {
        "Baseline", "During", "FollowUp"
    };

    private static readonly HashSet<string> AllowedSymptoms = new(StringComparer.OrdinalIgnoreCase)
    {
        "none", "fatigue", "bloating", "nausea", "abdominal_pain", "rash",
        "dizziness", "headache", "breathing_difficulty", "throat_swelling",
        "fainting", "other"
    };

    private static readonly HashSet<string> AllowedChanges = new(StringComparer.OrdinalIgnoreCase)
    {
        "none", "more_energy", "less_energy", "better_sleep", "worse_sleep",
        "improved_digestion", "worse_digestion", "weight_change", "other"
    };

    public async Task<WellnessOverview> GetOverviewAsync(Guid userId, CancellationToken ct)
    {
        var profile = await repository.GetProfileAsync(userId, ct);
        var today = Today(profile?.TimeZone);
        var screening = await repository.GetScreeningAsync(userId, ct);
        var prefs = await mealPlanRepository.GetDietaryPreferenceAsync(userId, ct);
        var allergies = PlanningCatalogSnapshotProvider.SplitTokens(prefs?.AllergiesCsv);
        var flags = PlanningCatalogSnapshotProvider.SplitTokens(screening?.RiskFlagsCsv);
        var assessment = WellnessSafetyPolicy.Assess(profile?.BirthYear, flags, today.Year);
        var reviewComplete = screening is { AllergiesReviewed: true } &&
            string.Equals(screening.ReviewedAllergiesCsv, string.Join(',', allergies), StringComparison.Ordinal);
        var checkIns = await repository.GetCheckInsAsync(userId, today.AddDays(-365), today, ct);
        var views = checkIns.Where(x => x.LocalDate >= today.AddDays(-29)).Select(ToView).ToArray();
        var dailyDue = !views.Any(x => x.LocalDate == today && x.Phase == "During");
        var urgent = views.Any(x => x.LocalDate == today && x.UrgentHelpRecommended);
        var trend = CalculateTrend(checkIns, today);
        var needsReview = WellnessSafetyPolicy.RequiresWellbeingReview(checkIns, today);
        var guidance = urgent
            ? "Reported severe symptoms can be an emergency. Seek immediate medical assistance; do not continue the diet experiment."
            : needsReview
                ? "Several very-low wellbeing ratings were reported in the last week. Pause self-directed changes and ask a qualified professional to assess your situation."
                : assessment.Guidance;
        return new WellnessOverview(
            today, profile?.TimeZone ?? "Asia/Ho_Chi_Minh",
            needsReview && !assessment.RequiresProfessionalReview ? "WellbeingReviewRequired" : assessment.Segment,
            assessment.RequiresProfessionalReview || needsReview, reviewComplete, dailyDue, urgent,
            flags, allergies, guidance, views, trend);
    }

    public async Task<ServiceResult<WellnessOverview>> SaveScreeningAsync(
        Guid userId, ScreeningCommand input, CancellationToken ct)
    {
        if (input.RiskFlags.Count > 10 || input.Allergies.Count > 30 ||
            input.Allergies.Any(x => string.IsNullOrWhiteSpace(x) || x.Length > 70) ||
            input.RiskFlags.Any(x => string.IsNullOrWhiteSpace(x) || x.Length > 60))
            return ServiceResult.Failure<WellnessOverview>("invalid_screening", "Too many or invalid screening values.");

        var flags = input.RiskFlags.Select(x => x.Trim().ToLowerInvariant())
            .Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(x => x, StringComparer.Ordinal).ToList();
        if (!WellnessSafetyPolicy.IsValidRiskFlags(flags))
            return ServiceResult.Failure<WellnessOverview>("invalid_risk_flags", "Unsupported or conflicting health flags.");

        var allergies = input.Allergies.Select(PlanningCatalogSnapshotProvider.NormalizeToken)
            .Where(x => x.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(x => x, StringComparer.Ordinal).ToArray();
        var currentPreference = await mealPlanRepository.GetDietaryPreferenceAsync(userId, ct);
        var now = clock.GetUtcNow();
        await mealPlanRepository.UpsertDietaryPreferenceAsync(new UserDietaryPreference
        {
            UserId = userId,
            DietaryPattern = currentPreference?.DietaryPattern ?? "PlantForward",
            AllergiesCsv = string.Join(',', allergies),
            ExcludedFoodsCsv = currentPreference?.ExcludedFoodsCsv ?? string.Empty,
            PreferredCuisine = currentPreference?.PreferredCuisine,
            UpdatedAt = now
        }, ct);
        await repository.UpsertScreeningAsync(new WellnessScreening
        {
            UserId = userId,
            RiskFlagsCsv = string.Join(',', flags),
            AllergiesReviewed = input.AllergiesReviewed,
            ReviewedAllergiesCsv = string.Join(',', allergies),
            ReviewedAt = now
        }, ct);
        await repository.SaveChangesAsync(ct);
        return ServiceResult.Success(await GetOverviewAsync(userId, ct));
    }

    public async Task<ServiceResult<CheckInView>> SaveCheckInAsync(
        Guid userId, CheckInCommand input, CancellationToken ct)
    {
        var profile = await repository.GetProfileAsync(userId, ct);
        var today = Today(profile?.TimeZone);
        if (input.LocalDate > today || input.LocalDate < today.AddDays(-365) ||
            !AllowedPhases.Contains(input.Phase) ||
            input.Energy is < 1 or > 5 || input.Mood is < 1 or > 5 ||
            input.Digestion is < 1 or > 5 || input.SleepQuality is < 1 or > 5 ||
            input.Symptoms.Count > 12 || input.BodyChanges.Count > 8 ||
            input.Notes?.Length > 500 || input.WeightKg is < 20m or > 350m)
            return ServiceResult.Failure<CheckInView>("invalid_check_in", "Invalid date, rating, or measurement.");

        var symptoms = input.Symptoms.Select(x => x.Trim().ToLowerInvariant())
            .Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(x => x, StringComparer.Ordinal).ToArray();
        var changes = input.BodyChanges.Select(x => x.Trim().ToLowerInvariant())
            .Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(x => x, StringComparer.Ordinal).ToArray();
        if (symptoms.Any(x => !AllowedSymptoms.Contains(x)) ||
            changes.Any(x => !AllowedChanges.Contains(x)) ||
            (symptoms.Contains("none") && symptoms.Length > 1) ||
            (changes.Contains("none") && changes.Length > 1))
            return ServiceResult.Failure<CheckInView>("invalid_check_in_tags", "Unsupported or conflicting symptom/change tags.");

        var phase = AllowedPhases.First(x => string.Equals(x, input.Phase, StringComparison.OrdinalIgnoreCase));
        var existing = await repository.GetCheckInAsync(userId, input.LocalDate, phase, ct);
        var entity = existing ?? new WellnessCheckIn
        {
            UserId = userId, LocalDate = input.LocalDate, Phase = phase
        };
        entity.Energy = input.Energy;
        entity.Mood = input.Mood;
        entity.Digestion = input.Digestion;
        entity.SleepQuality = input.SleepQuality;
        entity.SymptomsCsv = string.Join(',', symptoms);
        entity.BodyChangesCsv = string.Join(',', changes);
        entity.WeightKg = input.WeightKg;
        entity.Notes = input.Notes?.Trim();
        entity.RecordedAt = clock.GetUtcNow();
        if (existing is null)
            await repository.AddCheckInAsync(entity, ct);
        await repository.SaveChangesAsync(ct);
        return ServiceResult.Success(ToView(entity));
    }

    public async Task<ServiceResult<bool>> DeleteCheckInAsync(
        Guid userId, Guid checkInId, CancellationToken ct)
    {
        var existing = await repository.GetCheckInByIdAsync(userId, checkInId, ct);
        if (existing is null)
            return ServiceResult.Failure<bool>("check_in_not_found", "Check-in not found.");
        repository.RemoveCheckIn(existing);
        await repository.SaveChangesAsync(ct);
        return ServiceResult.Success(true);
    }

    private static WellnessTrendSnapshot CalculateTrend(
        IReadOnlyList<WellnessCheckIn> history, DateOnly today)
    {
        var during = history.Where(x => x.Phase == "During").ToArray();
        var baseline = history.Where(x => x.Phase == "Baseline")
            .OrderBy(x => x.LocalDate).ThenBy(x => x.RecordedAt).FirstOrDefault();
        var latest = history.Where(x => x.Phase is "During" or "FollowUp")
            .OrderByDescending(x => x.LocalDate).ThenByDescending(x => x.RecordedAt).FirstOrDefault();
        static decimal? Average(WellnessCheckIn[] records, Func<WellnessCheckIn, int> selector) =>
            records.Length == 0 ? null : Math.Round(records.Average(x => (decimal)selector(x)), 2);
        var repeatedLowWellbeing = WellnessSafetyPolicy.RequiresWellbeingReview(during, today);
        return new WellnessTrendSnapshot(
            history.Select(x => x.LocalDate).Distinct().Count(),
            during.Select(x => x.LocalDate).Distinct().Count(),
            Average(during, x => x.Energy),
            Average(during, x => x.Mood),
            Average(during, x => x.Digestion),
            Average(during, x => x.SleepQuality),
            baseline?.Energy, latest?.Energy,
            baseline is not null && latest is not null ? latest.Energy - baseline.Energy : null,
            baseline?.WeightKg is { } startWeight && latest?.WeightKg is { } latestWeight
                ? latestWeight - startWeight : null,
            repeatedLowWellbeing);
    }

    private DateOnly Today(string? timezone)
    {
        try
        {
            var zone = TimeZoneInfo.FindSystemTimeZoneById(timezone ?? "Asia/Ho_Chi_Minh");
            return DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(clock.GetUtcNow(), zone).DateTime);
        }
        catch (TimeZoneNotFoundException)
        {
            return DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
        }
        catch (InvalidTimeZoneException)
        {
            return DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
        }
    }

    private static CheckInView ToView(WellnessCheckIn x)
    {
        var symptoms = PlanningCatalogSnapshotProvider.SplitTokens(x.SymptomsCsv);
        return new CheckInView(x.Id, x.LocalDate, x.Phase, x.Energy, x.Mood,
            x.Digestion, x.SleepQuality, symptoms,
            PlanningCatalogSnapshotProvider.SplitTokens(x.BodyChangesCsv),
            x.WeightKg, x.Notes, x.RecordedAt, WellnessSafetyPolicy.IsUrgent(symptoms));
    }
}
