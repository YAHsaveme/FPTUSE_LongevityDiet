using System.Globalization;
using LongevityDiet.Domain.Entities;
using LongevityDiet.Repositories.Repositories;
using LongevityDiet.Services.Identity;
using LongevityDiet.Services.Wellness;

namespace LongevityDiet.Services.Planning;

public sealed class MealPlanningService(
    IMealPlanRepository mealPlanRepository,
    IPlanningInputProvider planningInputProvider,
    IWellnessRepository wellnessRepository,
    TimeProvider timeProvider,
    IAiMealChoiceGenerator? aiGenerator = null)
{
    public bool IsAiConfigured => aiGenerator is not null;
    private static readonly HashSet<string> SupportedDietaryPatterns =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "PlantForward",
            "Pescatarian",
            "StrictlyPlantBased"
        };

    private static readonly (string Code, string Title)[] DailyFocusRotation =
    [
        ("PLANT_FOUNDATION", "Ưu tiên rau củ và chất béo lành mạnh từ thực vật"),
        ("LEGUME_CONSISTENCY", "Duy trì đậu và hạt làm nguồn đạm trung tâm"),
        ("WHOLE_GRAIN_BALANCE", "Chọn tinh bột phức hợp nguyên cám ổn định năng lượng"),
        ("LOW_SUGAR_RHYTHM", "Giữ lượng đường tinh luyện và chất béo bão hòa ở mức thấp"),
        ("EATING_WINDOW_SYNC", "Đồng bộ bữa ăn trong khung 11–12 giờ"),
        ("EVENING_LIGHTNESS", "Bữa tối nhẹ nhàng, hoàn tất sớm trước giờ ngủ"),
        ("SUSTAINABLE_VARIETY", "Đa dạng hóa thực vật theo mùa và khẩu vị truyền thống")
    ];

    public async Task<ServiceResult<DietaryPreferenceSummary>> GetDietaryPreferenceAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var context = await planningInputProvider.GetUserContextAsync(userId, cancellationToken);
        if (context is null)
        {
            return ServiceResult.Failure<DietaryPreferenceSummary>(
                "user_not_found",
                "User was not found.");
        }

        var existing = await mealPlanRepository.GetDietaryPreferenceAsync(userId, cancellationToken);
        return ServiceResult.Success(new DietaryPreferenceSummary(
            userId,
            context.DietaryPattern,
            context.Allergies,
            context.ExcludedFoods,
            context.PreferredCuisine,
            existing?.UpdatedAt ?? timeProvider.GetUtcNow()));
    }

    public async Task<ServiceResult<DietaryPreferenceSummary>> UpdateDietaryPreferenceAsync(
        Guid userId,
        UpdateDietaryPreferenceCommand command,
        CancellationToken cancellationToken = default)
    {
        var context = await planningInputProvider.GetUserContextAsync(userId, cancellationToken);
        if (context is null)
        {
            return ServiceResult.Failure<DietaryPreferenceSummary>(
                "user_not_found",
                "User was not found.");
        }

        var pattern = NormalizeDietaryPattern(command.DietaryPattern);
        if (pattern is null)
        {
            return ServiceResult.Failure<DietaryPreferenceSummary>(
                "invalid_dietary_pattern",
                "Dietary pattern must be PlantForward, Pescatarian, or StrictlyPlantBased.");
        }

        var allergies = NormalizeTokens(command.Allergies);
        var exclusions = NormalizeTokens(command.ExcludedFoods);
        var cuisine = string.IsNullOrWhiteSpace(command.PreferredCuisine)
            ? null
            : command.PreferredCuisine.Trim();

        var now = timeProvider.GetUtcNow();
        var entity = new UserDietaryPreference
        {
            UserId = userId,
            DietaryPattern = pattern,
            AllergiesCsv = string.Join(',', allergies),
            ExcludedFoodsCsv = string.Join(',', exclusions),
            PreferredCuisine = cuisine,
            UpdatedAt = now,
        };

        await mealPlanRepository.UpsertDietaryPreferenceAsync(entity, cancellationToken);
        await mealPlanRepository.SaveChangesAsync(cancellationToken);

        return ServiceResult.Success(new DietaryPreferenceSummary(
            userId,
            pattern,
            allergies,
            exclusions,
            cuisine,
            now));
    }

    public async Task<ServiceResult<IReadOnlyList<PlanningCandidateMealSnapshot>>> GetActiveCandidatesAsync(
        CancellationToken cancellationToken = default)
    {
        var candidates = await planningInputProvider.GetCandidateMealsAsync(cancellationToken);
        var active = candidates
            .Where(x => x.IsActive)
            .OrderBy(x => x.CandidateCode, StringComparer.Ordinal)
            .ToList();

        return ServiceResult.Success<IReadOnlyList<PlanningCandidateMealSnapshot>>(active);
    }

    public async Task<ServiceResult<MealPlanSummary>> GetCurrentPlanAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var plan = await mealPlanRepository.GetActiveByUserAsync(userId, cancellationToken);
        if (plan is null)
        {
            return ServiceResult.Failure<MealPlanSummary>(
                "meal_plan_not_found",
                "No active meal plan was found for the current user.");
        }

        var context = await planningInputProvider.GetUserContextAsync(userId, cancellationToken);
        if (context is not null)
        {
            var safety = await VerifySafetyAsync(context, requireScreening: true, cancellationToken);
            if (!safety.Succeeded)
                return ServiceResult.Failure<MealPlanSummary>(
                    safety.ErrorCode ?? "meal_plan_safety", safety.ErrorMessage ?? "A health safety review is needed.");
            if (!PlanCoversUserConstraints(plan, context))
                return ServiceResult.Failure<MealPlanSummary>(
                    "outdated_meal_plan_restrictions", "Diet preferences or allergies changed. Refresh the plan before using it.");
        }

        return ServiceResult.Success(ToSummary(plan));
    }

    public async Task<ServiceResult<MealPlanSummary>> GetPlanByIdAsync(
        Guid userId,
        Guid planId,
        CancellationToken cancellationToken = default)
    {
        var plan = await mealPlanRepository.GetByIdForUserAsync(planId, userId, cancellationToken);
        if (plan is null)
        {
            return ServiceResult.Failure<MealPlanSummary>(
                "meal_plan_not_found",
                "Meal plan was not found.");
        }

        return ServiceResult.Success(ToSummary(plan));
    }

    public async Task<ServiceResult<IReadOnlyList<MealPlanSummary>>> ListPlansAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var plans = await mealPlanRepository.ListByUserAsync(userId, cancellationToken);
        var summaries = plans.Select(ToSummary).ToList();
        return ServiceResult.Success<IReadOnlyList<MealPlanSummary>>(summaries);
    }

    /// <summary>Idempotent rolling 14-day coverage when the member opens the planner.</summary>
    public async Task<ServiceResult<MealPlanSummary>> EnsureDailyCoverageAsync(
        Guid userId, CancellationToken cancellationToken = default)
    {
        var userContext = await planningInputProvider.GetUserContextAsync(userId, cancellationToken);
        if (userContext is null)
            return ServiceResult.Failure<MealPlanSummary>("user_not_found", "User not found.");

        var safety = await VerifySafetyAsync(userContext, requireScreening: true, cancellationToken);
        if (!safety.Succeeded)
            return ServiceResult.Failure<MealPlanSummary>(
                safety.ErrorCode ?? "screening_required", safety.ErrorMessage ?? "Screening required.");

        var now = timeProvider.GetUtcNow();
        var today = ResolveLocalDate(now, userContext.TimeZone);
        var active = await mealPlanRepository.GetActiveByUserAsync(userId, cancellationToken);
        if (active is null)
        {
            // Respect an explicit member archive. Automated rolling coverage must not
            // silently re-create a plan the member just removed from the workspace.
            var history = await mealPlanRepository.ListByUserAsync(userId, cancellationToken);
            if (history.Count > 0 && history[0].Status == MealPlanStatus.Archived)
                return ServiceResult.Failure<MealPlanSummary>(
                    "plan_archived_manual_start_required",
                    "This plan was archived. Create a new plan when you are ready.");
        }
        var restrictionsMatch = active is not null && PlanCoversUserConstraints(active, userContext);
        // A change in allergies or exclusions must invalidate yesterday's plan immediately.
        if (restrictionsMatch && active!.StartDate <= today && active.EndDate >= today.AddDays(4))
            return ServiceResult.Success(ToSummary(active));

        var keepDays = restrictionsMatch
            ? active!.Days.Where(x => x.PlanDate >= today && x.PlanDate <= today.AddDays(13))
                .OrderBy(x => x.PlanDate).ToArray()
            : [];

        var ruleSet = await planningInputProvider.GetActiveRuleSetAsync(cancellationToken);
        var candidates = await planningInputProvider.GetCandidateMealsAsync(cancellationToken);
        var result = BuildDeterministicPlan(
            userContext, ruleSet, candidates, today, 14,
            (active?.RevisionNumber ?? 0) + 1, active?.Id, keepDays, now);

        if (!result.Succeeded || result.Value is null)
            return ServiceResult.Failure<MealPlanSummary>(result.ErrorCode ?? "plan_generation_failed", result.ErrorMessage ?? "Could not build a daily plan.");

        if (active is not null)
        {
            active.Status = MealPlanStatus.Superseded;
            active.UpdatedAt = now;
        }
        await mealPlanRepository.AddAsync(result.Value, cancellationToken);
        await mealPlanRepository.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success(ToSummary(result.Value));
    }

    private static bool PlanCoversUserConstraints(MealPlan active, PlanningUserContextSnapshot context)
    {
        var recordedAllergens = AllergenVocabulary.Expand(
            PlanningCatalogSnapshotProvider.SplitTokens(active.AppliedAllergiesCsv));
        var recordedExclusions = AllergenVocabulary.Expand(
            PlanningCatalogSnapshotProvider.SplitTokens(active.AppliedExclusionsCsv));
        return active.MealsPerDay == context.PreferredMealFrequency &&
            string.Equals(active.DietaryPattern, context.DietaryPattern, StringComparison.OrdinalIgnoreCase) &&
            AllergenVocabulary.Expand(context.Allergies).All(recordedAllergens.Contains) &&
            AllergenVocabulary.Expand(context.ExcludedFoods).All(recordedExclusions.Contains);
    }

    private async Task<ServiceResult<bool>> VerifySafetyAsync(
        PlanningUserContextSnapshot context, bool requireScreening, CancellationToken cancellationToken)
    {
        var screening = await wellnessRepository.GetScreeningAsync(context.UserId, cancellationToken);
        if (screening is null && requireScreening)
            return ServiceResult.Failure<bool>("screening_required", "Complete health and allergy screening before continuing.");

        if (context.Allergies.Any(x => !AllergenVocabulary.IsKnown(x)))
            return ServiceResult.Failure<bool>(
                "unverified_allergen",
                "At least one allergy name could not be mapped safely. Request professional review before using an automatic meal plan.");

        var assessment = WellnessSafetyPolicy.Assess(context.BirthYear,
            PlanningCatalogSnapshotProvider.SplitTokens(screening?.RiskFlagsCsv),
            ResolveLocalDate(timeProvider.GetUtcNow(), context.TimeZone).Year);
        if (assessment.RequiresProfessionalReview)
            return ServiceResult.Failure<bool>(
                "professional_review_required", assessment.Guidance);

        if (screening is not null &&
            (!screening.AllergiesReviewed ||
             !string.Equals(screening.ReviewedAllergiesCsv,
                 string.Join(',', context.Allergies), StringComparison.Ordinal)))
            return ServiceResult.Failure<bool>(
                "allergy_review_required", "Review current allergies before generating or changing a plan.");

        var today = ResolveLocalDate(timeProvider.GetUtcNow(), context.TimeZone);
        var checkIns = await wellnessRepository.GetCheckInsAsync(context.UserId, today.AddDays(-6), today, cancellationToken);
        if (checkIns.Where(x => x.LocalDate == today).Any(x => WellnessSafetyPolicy.IsUrgent(
            PlanningCatalogSnapshotProvider.SplitTokens(x.SymptomsCsv))))
            return ServiceResult.Failure<bool>(
                "urgent_health_warning", "Seek urgent medical assistance for reported severe symptoms.");

        if (WellnessSafetyPolicy.RequiresWellbeingReview(checkIns, today))
            return ServiceResult.Failure<bool>(
                "wellbeing_review_required",
                "Repeated low self-reported wellbeing needs review. Pause automated diet planning and consult a qualified professional.");

        return ServiceResult.Success(true);
    }

    public async Task<ServiceResult<MealPlanSummary>> GeneratePlanAsync(
        Guid userId,
        GenerateMealPlanCommand command,
        CancellationToken cancellationToken = default)
    {
        if (command.Days is < 7 or > 14)
        {
            return ServiceResult.Failure<MealPlanSummary>(
                "invalid_plan_days",
                "Meal plan duration must be between 7 and 14 days.");
        }

        var userContext = await planningInputProvider.GetUserContextAsync(userId, cancellationToken);
        if (userContext is null)
        {
            return ServiceResult.Failure<MealPlanSummary>(
                "user_not_found",
                "User was not found.");
        }

        var effectivePattern = command.DietaryPattern is not null
            ? NormalizeDietaryPattern(command.DietaryPattern)
            : userContext.DietaryPattern;

        if (effectivePattern is null)
        {
            return ServiceResult.Failure<MealPlanSummary>(
                "invalid_dietary_pattern",
                "Dietary pattern must be PlantForward, Pescatarian, or StrictlyPlantBased.");
        }

        var mergedAllergies = MergeTokens(userContext.Allergies, command.Allergies);
        var mergedExclusions = MergeTokens(userContext.ExcludedFoods, command.ExcludedFoods);
        var effectiveCuisine = !string.IsNullOrWhiteSpace(command.PreferredCuisine)
            ? command.PreferredCuisine.Trim()
            : userContext.PreferredCuisine;

        var now = timeProvider.GetUtcNow();

        var effectiveContext = userContext with
        {
            DietaryPattern = effectivePattern,
            Allergies = mergedAllergies,
            ExcludedFoods = mergedExclusions,
            PreferredCuisine = effectiveCuisine,
        };

        // Validate the entire requested restriction set before staging preference changes.
        var safety = await VerifySafetyAsync(effectiveContext, requireScreening: true, cancellationToken);
        if (!safety.Succeeded)
            return ServiceResult.Failure<MealPlanSummary>(
                safety.ErrorCode ?? "plan_safety", safety.ErrorMessage ?? "Plan not available.");

        if (command.DietaryPattern is not null ||
            command.Allergies is not null ||
            command.ExcludedFoods is not null ||
            command.PreferredCuisine is not null)
        {
            await mealPlanRepository.UpsertDietaryPreferenceAsync(
                new UserDietaryPreference
                {
                    UserId = userId,
                    DietaryPattern = effectivePattern,
                    AllergiesCsv = string.Join(',', mergedAllergies),
                    ExcludedFoodsCsv = string.Join(',', mergedExclusions),
                    PreferredCuisine = effectiveCuisine,
                    UpdatedAt = now,
                },
                cancellationToken);
        }

        var ruleSet = await planningInputProvider.GetActiveRuleSetAsync(cancellationToken);
        var candidates = await planningInputProvider.GetCandidateMealsAsync(cancellationToken);

        var currentActive = await mealPlanRepository.GetActiveByUserAsync(userId, cancellationToken);
        var revisionNumber = currentActive is null ? 1 : currentActive.RevisionNumber + 1;
        var previousPlanId = currentActive?.Id;

        var startDate = command.StartDate ?? ResolveLocalDate(now, effectiveContext.TimeZone);
        if (command.UseAi && aiGenerator is null)
            return ServiceResult.Failure<MealPlanSummary>(
                "ai_not_configured", "Mô hình AI chưa được cài đặt. Bạn có thể tạo thực đơn theo quy tắc đã kiểm chứng.");

        var aiSelections = command.UseAi
            ? await SelectSafeAiCandidatesAsync(effectiveContext, ruleSet, candidates, startDate,
                command.Days, cancellationToken)
            : [];

        var buildResult = BuildDeterministicPlan(
            effectiveContext,
            ruleSet,
            candidates,
            startDate,
            command.Days,
            revisionNumber,
            previousPlanId,
            preservedDays: [],
            now,
            aiSelections);

        if (!buildResult.Succeeded || buildResult.Value is null)
        {
            return ServiceResult.Failure<MealPlanSummary>(
                buildResult.ErrorCode ?? "plan_generation_failed",
                buildResult.ErrorMessage ?? "Could not generate meal plan.");
        }

        if (command.UseAi)
        {
            buildResult.Value.PlanExplanation += aiSelections.Count > 0
                ? " AI đã hỗ trợ chọn mã món trong tập ứng viên an toàn; hệ thống kiểm tra lại và áp dụng giới hạn dinh dưỡng trước khi lưu."
                : " AI không phản hồi hợp lệ; thực đơn được tạo bằng bộ quy tắc tất định, không giả nhận kết quả từ mô hình.";
        }

        if (currentActive is not null)
        {
            currentActive.Status = MealPlanStatus.Superseded;
            currentActive.UpdatedAt = now;
        }

        await mealPlanRepository.AddAsync(buildResult.Value, cancellationToken);
        await mealPlanRepository.SaveChangesAsync(cancellationToken);

        return ServiceResult.Success(ToSummary(buildResult.Value));
    }

    public async Task<ServiceResult<MealPlanSummary>> RegeneratePlanAsync(
        Guid userId,
        Guid planId,
        RegenerateMealPlanCommand command,
        CancellationToken cancellationToken = default)
    {
        var existingPlan = await mealPlanRepository.GetByIdForUserAsync(planId, userId, cancellationToken);
        if (existingPlan is null)
        {
            return ServiceResult.Failure<MealPlanSummary>(
                "meal_plan_not_found",
                "Meal plan was not found.");
        }

        var userContext = await planningInputProvider.GetUserContextAsync(userId, cancellationToken);
        if (userContext is null)
        {
            return ServiceResult.Failure<MealPlanSummary>(
                "user_not_found",
                "User was not found.");
        }

        var safety = await VerifySafetyAsync(userContext, requireScreening: true, cancellationToken);
        if (!safety.Succeeded)
            return ServiceResult.Failure<MealPlanSummary>(
                safety.ErrorCode ?? "plan_safety", safety.ErrorMessage ?? "Plan not available.");

        var ruleSet = await planningInputProvider.GetActiveRuleSetAsync(cancellationToken);
        var candidates = await planningInputProvider.GetCandidateMealsAsync(cancellationToken);
        var now = timeProvider.GetUtcNow();

        var totalDays = existingPlan.Days.Count >= 7 ? existingPlan.Days.Count : 7;
        var fromDate = command.FromDate ?? existingPlan.StartDate;

        // Do not preserve old meals if the current user's allergies, exclusions
        // or dietary pattern are not all satisfied by the historical revision.
        var preservedDays = PlanCoversUserConstraints(existingPlan, userContext)
            ? existingPlan.Days.Where(d => d.PlanDate < fromDate)
                .OrderBy(d => d.DayNumber).ToList()
            : [];

        var newRevisionNumber = existingPlan.RevisionNumber + 1;

        var buildResult = BuildDeterministicPlan(
            userContext,
            ruleSet,
            candidates,
            existingPlan.StartDate,
            totalDays,
            newRevisionNumber,
            existingPlan.Id,
            preservedDays,
            now);

        if (!buildResult.Succeeded || buildResult.Value is null)
        {
            return ServiceResult.Failure<MealPlanSummary>(
                buildResult.ErrorCode ?? "plan_regeneration_failed",
                buildResult.ErrorMessage ?? "Could not regenerate meal plan.");
        }

        existingPlan.Status = MealPlanStatus.Superseded;
        existingPlan.UpdatedAt = now;

        await mealPlanRepository.AddAsync(buildResult.Value, cancellationToken);
        await mealPlanRepository.SaveChangesAsync(cancellationToken);

        return ServiceResult.Success(ToSummary(buildResult.Value));
    }

    public async Task<ServiceResult<MealPlanSummary>> RegeneratePlannedMealAsync(
        Guid userId,
        Guid planId,
        Guid plannedMealId,
        RegeneratePlannedMealCommand command,
        CancellationToken cancellationToken = default)
    {
        var plan = await mealPlanRepository.GetByIdForUserAsync(planId, userId, cancellationToken);
        if (plan is null)
        {
            return ServiceResult.Failure<MealPlanSummary>(
                "meal_plan_not_found",
                "Meal plan was not found.");
        }

        var targetDay = plan.Days.FirstOrDefault(d => d.Meals.Any(m => m.Id == plannedMealId));
        var targetMeal = targetDay?.Meals.FirstOrDefault(m => m.Id == plannedMealId);
        if (targetDay is null || targetMeal is null)
        {
            return ServiceResult.Failure<MealPlanSummary>(
                "planned_meal_not_found",
                "Planned meal was not found in the specified meal plan.");
        }

        var userContext = await planningInputProvider.GetUserContextAsync(userId, cancellationToken);
        if (userContext is null)
        {
            return ServiceResult.Failure<MealPlanSummary>(
                "user_not_found",
                "User was not found.");
        }

        var extraExclusions = NormalizeTokens(command.AdditionalExcludedCodes);
        var effectiveContext = userContext with
        {
            Allergies = MergeTokens(
                userContext.Allergies,
                PlanningCatalogSnapshotProvider.SplitTokens(plan.AppliedAllergiesCsv)),
            ExcludedFoods = MergeTokens(
                MergeTokens(
                    userContext.ExcludedFoods,
                    PlanningCatalogSnapshotProvider.SplitTokens(plan.AppliedExclusionsCsv)),
                extraExclusions),
        };

        // Optional extra exclusions are safe, but the screening must match the
        // user's CURRENT allergies. Historical allergy tags may be more restrictive.
        var safety = await VerifySafetyAsync(userContext, requireScreening: true, cancellationToken);
        if (!safety.Succeeded)
            return ServiceResult.Failure<MealPlanSummary>(
                safety.ErrorCode ?? "plan_safety", safety.ErrorMessage ?? "Plan not available.");

        if (!PlanCoversUserConstraints(plan, userContext))
            return ServiceResult.Failure<MealPlanSummary>(
                "outdated_meal_plan_restrictions",
                "Allergies or dietary restrictions changed. Refresh the plan before changing a meal.");

        var ruleSet = await planningInputProvider.GetActiveRuleSetAsync(cancellationToken);
        var candidates = await planningInputProvider.GetCandidateMealsAsync(cancellationToken);
        var now = timeProvider.GetUtcNow();

        var rankedSlotCandidates = FilterAndRankCandidatesForSlot(
            candidates,
            effectiveContext,
            ruleSet,
            targetMeal.SlotType,
            now.Year);

        if (rankedSlotCandidates.Count == 0)
        {
            return ServiceResult.Failure<MealPlanSummary>(
                "no_safe_candidates",
                "Không tìm thấy món ăn thay thế an toàn phù hợp với ràng buộc dị ứng và loại trừ của bạn.");
        }

        var nextRegenerationCount = targetMeal.RegenerationCount + 1;
        var alternatives = rankedSlotCandidates
            .Where(x => !string.Equals(x.Candidate.CandidateCode, targetMeal.CandidateCode, StringComparison.OrdinalIgnoreCase))
            .ToList();

        var chosen = alternatives.Count > 0
            ? alternatives[(targetDay.DayNumber - 1 + nextRegenerationCount - 1) % alternatives.Count]
            : rankedSlotCandidates[0];
        if (chosen.Candidate.ContainsFish && ExceedsWeeklyFishLimit(plan, targetDay.PlanDate, targetMeal.Id))
        {
            var nonFish = rankedSlotCandidates
                .Where(x => !x.Candidate.ContainsFish &&
                    !string.Equals(x.Candidate.CandidateCode, targetMeal.CandidateCode,
                        StringComparison.OrdinalIgnoreCase)).ToList();
            if (nonFish.Count == 0)
                return ServiceResult.Failure<MealPlanSummary>(
                    "fish_frequency_limit", "No non-fish alternative is available this week.");
            chosen = nonFish[0];
        }

        ApplyCandidateToPlannedMeal(targetMeal, chosen, ruleSet.RuleSetVersion, nextRegenerationCount, now);
        targetDay.TargetCaloriesKcal = targetDay.Meals.Sum(m => m.CaloriesKcal);
        plan.UpdatedAt = now;

        await mealPlanRepository.SaveChangesAsync(cancellationToken);

        return ServiceResult.Success(ToSummary(plan));
    }

    // Full member CRUD for scheduled meals. This never writes a free-text AI meal:
    // every selection comes from active, ingredient-complete catalog candidates
    // that pass the same allergy and dietary checks as automatic generation.
    public Task<ServiceResult<MealPlanSummary>> AddPlannedMealAsync(
        Guid userId, Guid planId, Guid dayId, SavePlannedMealCommand command,
        CancellationToken cancellationToken = default) =>
        SavePlannedMealAsync(userId, planId, dayId, null, command, cancellationToken);

    public Task<ServiceResult<MealPlanSummary>> UpdatePlannedMealAsync(
        Guid userId, Guid planId, Guid plannedMealId, SavePlannedMealCommand command,
        CancellationToken cancellationToken = default) =>
        SavePlannedMealAsync(userId, planId, null, plannedMealId, command, cancellationToken);

    private async Task<ServiceResult<MealPlanSummary>> SavePlannedMealAsync(
        Guid userId, Guid planId, Guid? dayId, Guid? plannedMealId,
        SavePlannedMealCommand command, CancellationToken cancellationToken)
    {
        var plan = await mealPlanRepository.GetByIdForUserAsync(planId, userId, cancellationToken);
        if (plan is null)
            return ServiceResult.Failure<MealPlanSummary>("meal_plan_not_found", "Meal plan was not found.");
        if (plan.Status != MealPlanStatus.Active)
            return ServiceResult.Failure<MealPlanSummary>("meal_plan_not_active", "Only an active meal plan can be edited.");

        if (!Enum.TryParse<MealSlotType>(command.SlotType, true, out var slot) ||
            !Enum.IsDefined(slot))
            return ServiceResult.Failure<MealPlanSummary>("invalid_meal_slot", "Choose Breakfast, Lunch, Dinner, or Snack.");
        if (string.IsNullOrWhiteSpace(command.CandidateCode) || command.CandidateCode.Length > 80)
            return ServiceResult.Failure<MealPlanSummary>("invalid_candidate_code", "Choose a recipe from the catalog.");

        MealPlanDay? day;
        PlannedMeal? existingMeal = null;
        if (plannedMealId is { } mealId)
        {
            day = plan.Days.FirstOrDefault(d => d.Meals.Any(m => m.Id == mealId));
            existingMeal = day?.Meals.FirstOrDefault(m => m.Id == mealId);
        }
        else
        {
            day = plan.Days.FirstOrDefault(d => d.Id == dayId);
        }
        if (day is null || (plannedMealId is not null && existingMeal is null))
            return ServiceResult.Failure<MealPlanSummary>("planned_meal_not_found", "The requested day or meal was not found.");
        if (existingMeal is null && day.Meals.Count >= 4)
            return ServiceResult.Failure<MealPlanSummary>("meal_day_full", "A day can contain at most four planned meals.");
        if (slot != MealSlotType.Snack &&
            day.Meals.Any(m => m.Id != existingMeal?.Id && m.SlotType == slot))
            return ServiceResult.Failure<MealPlanSummary>("duplicate_meal_slot", "That day already has a meal in the selected slot.");

        var context = await planningInputProvider.GetUserContextAsync(userId, cancellationToken);
        if (context is null)
            return ServiceResult.Failure<MealPlanSummary>("user_not_found", "User was not found.");
        var safety = await VerifySafetyAsync(context, requireScreening: true, cancellationToken);
        if (!safety.Succeeded)
            return ServiceResult.Failure<MealPlanSummary>(
                safety.ErrorCode ?? "meal_plan_safety", safety.ErrorMessage ?? "Safety screening is required.");
        if (!PlanCoversUserConstraints(plan, context))
            return ServiceResult.Failure<MealPlanSummary>(
                "outdated_meal_plan_restrictions", "Dietary restrictions changed. Refresh the plan first.");

        // Adult Longevity Diet guidance: confine eating to a 12-hour window
        // and leave at least three hours between the last meal and bedtime.
        var proposedTimes = day.Meals
            .Where(meal => meal.Id != existingMeal?.Id)
            .Select(meal => meal.PlannedTime.ToTimeSpan())
            .Append(command.PlannedTime.ToTimeSpan())
            .OrderBy(time => time)
            .ToArray();
        if (proposedTimes[^1] - proposedTimes[0] > TimeSpan.FromHours(12))
            return ServiceResult.Failure<MealPlanSummary>(
                "eating_window_limit", "All meals must fit within a twelve-hour eating window.");
        var bedtime = (context.SleepTime ?? new TimeOnly(23, 0)).ToTimeSpan();
        if (bedtime <= proposedTimes[^1])
            bedtime += TimeSpan.FromDays(1);
        if (bedtime - proposedTimes[^1] < TimeSpan.FromHours(3))
            return ServiceResult.Failure<MealPlanSummary>(
                "late_meal_restriction",
                "The last planned meal should finish at least three hours before bedtime.");

        var rules = await planningInputProvider.GetActiveRuleSetAsync(cancellationToken);
        var candidates = await planningInputProvider.GetCandidateMealsAsync(cancellationToken);
        var ranked = FilterAndRankCandidatesForSlot(candidates, context, rules, slot,
            timeProvider.GetUtcNow().Year);
        var selected = ranked.FirstOrDefault(x =>
            string.Equals(x.Candidate.CandidateCode, command.CandidateCode.Trim(),
                StringComparison.OrdinalIgnoreCase));
        if (selected is null)
            return ServiceResult.Failure<MealPlanSummary>("unsafe_or_missing_candidate",
                "The selected recipe is unavailable or does not meet the allergy/dietary checks.");
        if (selected.Candidate.ContainsFish &&
            ExceedsWeeklyFishLimit(plan, day.PlanDate, existingMeal?.Id))
            return ServiceResult.Failure<MealPlanSummary>("fish_frequency_limit",
                "Limit fish meals to three in any seven-day period; select a plant-forward alternative.");

        var now = timeProvider.GetUtcNow();
        var target = existingMeal;
        if (target is null)
        {
            target = new PlannedMeal
            {
                Id = Guid.NewGuid(),
                MealPlanDayId = day.Id,
                MealPlanId = plan.Id,
                UserId = userId,
                SlotOrder = day.Meals.Count == 0 ? 1 : day.Meals.Max(m => m.SlotOrder) + 1,
            };
            day.Meals.Add(target);
            await mealPlanRepository.AddPlannedMealAsync(target, cancellationToken);
        }
        target.SlotType = slot;
        target.PlannedTime = command.PlannedTime;
        ApplyCandidateToPlannedMeal(target, selected, rules.RuleSetVersion,
            (existingMeal?.RegenerationCount ?? 0) + (existingMeal is null ? 0 : 1), now);
        day.TargetCaloriesKcal = day.Meals.Sum(m => m.CaloriesKcal);
        plan.UpdatedAt = now;
        await mealPlanRepository.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success(ToSummary(plan));
    }

    public async Task<ServiceResult<MealPlanSummary>> DeletePlannedMealAsync(
        Guid userId, Guid planId, Guid plannedMealId,
        CancellationToken cancellationToken = default)
    {
        var plan = await mealPlanRepository.GetByIdForUserAsync(planId, userId, cancellationToken);
        if (plan is null)
            return ServiceResult.Failure<MealPlanSummary>("meal_plan_not_found", "Meal plan was not found.");
        if (plan.Status != MealPlanStatus.Active)
            return ServiceResult.Failure<MealPlanSummary>("meal_plan_not_active", "Only active plans can be edited.");
        var day = plan.Days.FirstOrDefault(d => d.Meals.Any(m => m.Id == plannedMealId));
        var meal = day?.Meals.FirstOrDefault(m => m.Id == plannedMealId);
        if (day is null || meal is null)
            return ServiceResult.Failure<MealPlanSummary>("planned_meal_not_found", "Planned meal was not found.");
        if (day.Meals.Count <= 1)
            return ServiceResult.Failure<MealPlanSummary>("last_meal_required",
                "Keep at least one meal in each day. Archive the entire plan if it is no longer needed.");

        // This is a required EF relationship configured with Cascade; removing the
        // child from its tracked parent's collection deletes the orphan on SaveChanges.
        day.Meals.Remove(meal);
        mealPlanRepository.RemovePlannedMeal(meal);
        day.TargetCaloriesKcal = day.Meals.Sum(m => m.CaloriesKcal);
        plan.UpdatedAt = timeProvider.GetUtcNow();
        await mealPlanRepository.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success(ToSummary(plan));
    }

    public async Task<ServiceResult<bool>> ArchivePlanAsync(
        Guid userId, Guid planId, CancellationToken cancellationToken = default)
    {
        var plan = await mealPlanRepository.GetByIdForUserAsync(planId, userId, cancellationToken);
        if (plan is null)
            return ServiceResult.Failure<bool>("meal_plan_not_found", "Meal plan was not found.");
        if (plan.Status != MealPlanStatus.Active)
            return ServiceResult.Failure<bool>("meal_plan_not_active", "Only an active plan can be archived.");
        plan.Status = MealPlanStatus.Archived;
        plan.UpdatedAt = timeProvider.GetUtcNow();
        await mealPlanRepository.SaveChangesAsync(cancellationToken);
        return ServiceResult.Success(true);
    }

    /// <summary>
    /// Source: Fondazione Valter Longo, Longevity Diet for Adults,
    /// https://www.fondazionevalterlongo.org/en/longevity-diet-for-adults/
    /// Maximum three fish meals in every seven-day window. Historical user records
    /// are never silently altered; this guard applies when adding/replacing meals.
    /// </summary>
    private static bool ExceedsWeeklyFishLimit(MealPlan plan, DateOnly targetDate, Guid? ignoredMealId)
    {
        for (var offset = 0; offset < 7; offset++)
        {
            var start = targetDate.AddDays(-offset);
            var end = start.AddDays(6);
            var fishCount = plan.Days
                .Where(d => d.PlanDate >= start && d.PlanDate <= end)
                .SelectMany(d => d.Meals)
                .Count(m => m.ContainsFish && m.Id != ignoredMealId);
            if (fishCount >= 3)
                return true;
        }
        return false;
    }

    /// <summary>
    /// AI may suggest only already-filtered active candidate codes. The trusted
    /// planner still verifies candidate membership and weekly fish limits.
    /// On model outage/invalid JSON, generation falls back to deterministic mode.
    /// </summary>
    private async Task<IReadOnlyList<AiMealChoice>> SelectSafeAiCandidatesAsync(
        PlanningUserContextSnapshot context,
        PlanningRuleSetSnapshot rules,
        IReadOnlyList<PlanningCandidateMealSnapshot> candidates,
        DateOnly startDate,
        int days,
        CancellationToken cancellationToken)
    {
        if (aiGenerator is null)
            return [];

        var slots = ResolveMealSlots(context.PreferredMealFrequency,
            context.WakeTime ?? new TimeOnly(6, 30),
            context.SleepTime ?? new TimeOnly(22, 30));
        var allowed = slots.ToDictionary(
            x => x.SlotType,
            x => FilterAndRankCandidatesForSlot(candidates, context, rules, x.SlotType,
                timeProvider.GetUtcNow().Year)
                .Take(12)
                .Select(item => new AiAllowedCandidate(item.Candidate.CandidateCode,
                    item.Candidate.Title,
                    item.Candidate.HasLegumes, item.Candidate.HasWholeGrains,
                    item.Candidate.ContainsFish))
                .ToArray());
        var choices = Enumerable.Range(0, days)
            .SelectMany(index => slots.Select(slot =>
                new AiMealChoiceOption(startDate.AddDays(index), slot.SlotType, allowed[slot.SlotType])))
            .ToArray();

        try
        {
            var requested = await aiGenerator.SuggestAsync(choices, cancellationToken);
            var verified = new List<AiMealChoice>();
            foreach (var suggestion in requested)
            {
                var source = choices.FirstOrDefault(x =>
                    x.Date == suggestion.Date && x.Slot == suggestion.Slot);
                if (source is null ||
                    !source.Candidates.Any(c =>
                        string.Equals(c.Code, suggestion.CandidateCode,
                            StringComparison.OrdinalIgnoreCase)) ||
                    verified.Any(x => x.Date == suggestion.Date && x.Slot == suggestion.Slot))
                    continue;
                verified.Add(suggestion);
            }
            return verified;
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return [];
        }
        catch (Exception) when (!cancellationToken.IsCancellationRequested)
        {
            // Local model not present / bad response / temporary outage: no hallucinated menu.
            return [];
        }
    }

    private static ServiceResult<MealPlan> BuildDeterministicPlan(
        PlanningUserContextSnapshot userContext,
        PlanningRuleSetSnapshot ruleSet,
        IReadOnlyList<PlanningCandidateMealSnapshot> candidates,
        DateOnly startDate,
        int daysCount,
        int revisionNumber,
        Guid? previousPlanId,
        IReadOnlyList<MealPlanDay> preservedDays,
        DateTimeOffset now,
        IReadOnlyList<AiMealChoice>? aiSelections = null)
    {
        var slots = ResolveMealSlots(
            userContext.PreferredMealFrequency,
            userContext.WakeTime ?? new TimeOnly(6, 30),
            userContext.SleepTime ?? new TimeOnly(22, 30));

        var rankedBySlot = new Dictionary<MealSlotType, IReadOnlyList<ScoredCandidate>>();
        foreach (var (slotType, _) in slots)
        {
            if (rankedBySlot.ContainsKey(slotType))
            {
                continue;
            }

            var ranked = FilterAndRankCandidatesForSlot(
                candidates,
                userContext,
                ruleSet,
                slotType,
                now.Year);

            if (ranked.Count == 0)
            {
                return ServiceResult.Failure<MealPlan>(
                    "no_safe_candidates",
                    $"Không có món ăn an toàn cho bữa {slotType} sau khi lọc dị ứng và thực phẩm loại trừ.");
            }

            rankedBySlot[slotType] = ranked;
        }

        var plan = new MealPlan
        {
            Id = Guid.NewGuid(),
            UserId = userContext.UserId,
            RuleSetVersion = ruleSet.RuleSetVersion,
            RevisionNumber = revisionNumber,
            PreviousPlanId = previousPlanId,
            Status = MealPlanStatus.Active,
            StartDate = startDate,
            EndDate = startDate.AddDays(daysCount - 1),
            MealsPerDay = slots.Count,
            TimeZone = userContext.TimeZone,
            DietaryPattern = userContext.DietaryPattern,
            AppliedAllergiesCsv = string.Join(',', userContext.Allergies),
            AppliedExclusionsCsv = string.Join(',', userContext.ExcludedFoods),
            ReasonCodesCsv = string.Join(',', ruleSet.Rules.Select(r => r.RuleKey)),
            PlanExplanation = BuildPlanExplanation(userContext, ruleSet, daysCount),
            GeneratedAt = now,
            UpdatedAt = now,
        };

        var preservedByDate = preservedDays.ToDictionary(x => x.PlanDate);
        var rotationOffset = Math.Max(0, revisionNumber - 1);

        for (var dayIndex = 0; dayIndex < daysCount; dayIndex++)
        {
            var dayNumber = dayIndex + 1;
            var planDate = startDate.AddDays(dayIndex);
            var (focusCode, focusTitle) = DailyFocusRotation[planDate.DayNumber % DailyFocusRotation.Length];

            if (preservedByDate.TryGetValue(planDate, out var preservedDay))
            {
                var clonedDay = ClonePreservedDay(plan.Id, userContext.UserId, dayNumber, planDate, preservedDay, now);
                plan.Days.Add(clonedDay);
                continue;
            }

            var dayEntity = new MealPlanDay
            {
                Id = Guid.NewGuid(),
                MealPlanId = plan.Id,
                DayNumber = dayNumber,
                PlanDate = planDate,
                DailyFocusCode = focusCode,
                DailyFocusTitle = focusTitle,
            };

            for (var slotIndex = 0; slotIndex < slots.Count; slotIndex++)
            {
                var (slotType, plannedTime) = slots[slotIndex];
                var slotPool = rankedBySlot[slotType];
                var pickIndex = (planDate.DayNumber + rotationOffset + slotIndex) % slotPool.Count;
                var selected = slotPool[pickIndex];
                var aiSelectedCode = aiSelections?.FirstOrDefault(choice =>
                    choice.Date == planDate && choice.Slot == slotType)?.CandidateCode;
                if (!string.IsNullOrWhiteSpace(aiSelectedCode))
                    selected = slotPool.FirstOrDefault(candidate =>
                        string.Equals(candidate.Candidate.CandidateCode, aiSelectedCode,
                            StringComparison.OrdinalIgnoreCase)) ?? selected;
                if (selected.Candidate.ContainsFish)
                {
                    // Fondazione Valter Longo: at most 2–3 fish meals per week.
                    // Do not generate a fourth fish meal in the preceding seven-day window.
                    var recentFish = plan.Days
                        .Where(d => d.PlanDate >= planDate.AddDays(-6))
                        .SelectMany(d => d.Meals).Count(m => m.ContainsFish)
                        + dayEntity.Meals.Count(m => m.ContainsFish);
                    if (recentFish >= 3)
                    {
                        var plantAlternative = slotPool
                            .Where(x => !x.Candidate.ContainsFish).ToList();
                        if (plantAlternative.Count == 0)
                            return ServiceResult.Failure<MealPlan>(
                                "fish_frequency_limit",
                                "No suitable plant-forward alternative is available for the weekly fish limit.");
                        selected = plantAlternative[pickIndex % plantAlternative.Count];
                    }
                }

                var plannedMeal = new PlannedMeal
                {
                    Id = Guid.NewGuid(),
                    MealPlanDayId = dayEntity.Id,
                    MealPlanId = plan.Id,
                    UserId = userContext.UserId,
                    SlotOrder = slotIndex + 1,
                    SlotType = slotType,
                    PlannedTime = plannedTime,
                };

                ApplyCandidateToPlannedMeal(plannedMeal, selected, ruleSet.RuleSetVersion, regenerationCount: 0, now);
                dayEntity.Meals.Add(plannedMeal);
            }

            dayEntity.TargetCaloriesKcal = dayEntity.Meals.Sum(x => x.CaloriesKcal);
            plan.Days.Add(dayEntity);
        }

        return ServiceResult.Success(plan);
    }

    public static IReadOnlyList<ScoredCandidate> FilterAndRankCandidatesForSlot(
        IReadOnlyList<PlanningCandidateMealSnapshot> candidates,
        PlanningUserContextSnapshot userContext,
        PlanningRuleSetSnapshot ruleSet,
        MealSlotType slotType,
        int currentYear)
    {
        var allergySet = AllergenVocabulary.Expand(userContext.Allergies)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var exclusionSet = AllergenVocabulary.Expand(userContext.ExcludedFoods)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var strictlyPlantBased = string.Equals(
            userContext.DietaryPattern,
            "StrictlyPlantBased",
            StringComparison.OrdinalIgnoreCase);

        var safeCandidates = candidates
            .Where(c => c.IsActive)
            .Where(c => c.SupportedSlots.Contains(slotType))
            .Where(c => c.Ingredients.Count > 0) // Fail closed when the ingredient list is unavailable.
            .Where(c => !strictlyPlantBased || (c.IsPlantBased && !c.ContainsFish))
            .Where(c => !ViolatesHardConstraints(c, allergySet, exclusionSet))
            .Select(c => ScoreCandidate(c, userContext, ruleSet, currentYear))
            .OrderByDescending(x => x.Score)
            .ThenBy(x => x.Candidate.CandidateCode, StringComparer.Ordinal)
            .ToList();

        return safeCandidates;
    }

    private static bool ViolatesHardConstraints(
        PlanningCandidateMealSnapshot candidate,
        HashSet<string> allergies,
        HashSet<string> exclusions)
    {
        if (allergies.Count == 0 && exclusions.Count == 0)
        {
            return false;
        }

        if (candidate.ContainsFish && (allergies.Contains("fish") || exclusions.Contains("fish")))
            return true;

        foreach (var normalized in AllergenVocabulary.Expand(candidate.Allergens))
        {
            if (allergies.Contains(normalized) || exclusions.Contains(normalized))
            {
                return true;
            }
        }

        foreach (var ingredient in candidate.Ingredients)
        {
            var normalized = PlanningCatalogSnapshotProvider.NormalizeToken(ingredient);
            if (allergies.Contains(normalized) || exclusions.Contains(normalized))
            {
                return true;
            }

            if (allergies.Any(a => normalized.Contains(a, StringComparison.OrdinalIgnoreCase)) ||
                exclusions.Any(e => normalized.Contains(e, StringComparison.OrdinalIgnoreCase)))
            {
                return true;
            }
        }

        var normalizedCode = PlanningCatalogSnapshotProvider.NormalizeToken(candidate.CandidateCode);
        var normalizedTitle = PlanningCatalogSnapshotProvider.NormalizeToken(candidate.Title);

        if (exclusions.Contains(normalizedCode))
        {
            return true;
        }

        foreach (var token in allergies.Concat(exclusions))
        {
            if (token.Length >= 3 &&
                (normalizedCode.Contains(token, StringComparison.OrdinalIgnoreCase) ||
                 normalizedTitle.Contains(token, StringComparison.OrdinalIgnoreCase)))
            {
                return true;
            }
        }

        return false;
    }

    private static ScoredCandidate ScoreCandidate(
        PlanningCandidateMealSnapshot candidate,
        PlanningUserContextSnapshot userContext,
        PlanningRuleSetSnapshot ruleSet,
        int currentYear)
    {
        var score = 30m;
        var reasons = new List<string>();
        var weights = ruleSet.Rules.ToDictionary(
            x => x.RuleKey,
            x => x.BaseWeight,
            StringComparer.OrdinalIgnoreCase);

        if (candidate.IsPlantBased)
        {
            score += weights.GetValueOrDefault("PLANT_FORWARD", 25m);
            reasons.Add("PLANT_FORWARD");
        }

        if (candidate.HasLegumes)
        {
            score += weights.GetValueOrDefault("LEGUME_PROTEIN", 20m);
            reasons.Add("LEGUME_PROTEIN");
        }

        if (candidate.HasWholeGrains)
        {
            score += weights.GetValueOrDefault("COMPLEX_CARBS", 15m);
            reasons.Add("COMPLEX_CARBS");
        }

        if (candidate.SugarGrams <= 6.5m && candidate.SaturatedFatGrams <= 2.5m)
        {
            score += weights.GetValueOrDefault("LOW_SUGAR_SATFAT", 15m);
            reasons.Add("LOW_SUGAR_SATFAT");
        }
        else if (candidate.SugarGrams > 12m || candidate.SaturatedFatGrams > 5m)
        {
            score -= 12m;
        }

        if (candidate.ContainsFish &&
            (string.Equals(userContext.DietaryPattern, "Pescatarian", StringComparison.OrdinalIgnoreCase) ||
             string.Equals(userContext.DietaryPattern, "PlantForward", StringComparison.OrdinalIgnoreCase)))
        {
            var fishBoost = string.Equals(userContext.DietaryPattern, "Pescatarian", StringComparison.OrdinalIgnoreCase)
                ? weights.GetValueOrDefault("MODERATE_FISH", 10m) + 8m
                : weights.GetValueOrDefault("MODERATE_FISH", 10m);
            score += fishBoost;
            reasons.Add("MODERATE_FISH");
        }

        var userAge = userContext.BirthYear.HasValue ? currentYear - userContext.BirthYear.Value : 35;
        if (userAge >= 65)
        {
            if (candidate.ProteinGrams >= 16m)
            {
                score += weights.GetValueOrDefault("AGE_PROTEIN_FIT", 10m);
                reasons.Add("AGE_PROTEIN_FIT");
            }
        }
        else if (candidate.ProteinGrams is >= 7m and <= 24m)
        {
            score += weights.GetValueOrDefault("AGE_PROTEIN_FIT", 10m);
            reasons.Add("AGE_PROTEIN_FIT");
        }

        if (!string.IsNullOrWhiteSpace(userContext.PreferredCuisine) &&
            string.Equals(candidate.Cuisine, userContext.PreferredCuisine, StringComparison.OrdinalIgnoreCase))
        {
            score += 12m;
            reasons.Add("CUISINE_MATCH");
        }

        if (candidate.FiberGrams >= 8m)
        {
            score += 5m;
            reasons.Add("HIGH_FIBER");
        }

        return new ScoredCandidate(
            candidate,
             decimal.Round(score, 2),
            reasons);
    }

    private static void ApplyCandidateToPlannedMeal(
        PlannedMeal meal,
        ScoredCandidate scored,
        string ruleSetVersion,
        int regenerationCount,
        DateTimeOffset now)
    {
        var c = scored.Candidate;
        meal.CandidateCode = c.CandidateCode;
        meal.Title = c.Title;
        meal.Description = c.Description;
        meal.Cuisine = c.Cuisine;
        meal.ServingSize = c.ServingSize;
        meal.ServingUnit = c.ServingUnit;
        meal.CaloriesKcal = c.CaloriesKcal;
        meal.ProteinGrams = c.ProteinGrams;
        meal.CarbsGrams = c.CarbsGrams;
        meal.FatGrams = c.FatGrams;
        meal.FiberGrams = c.FiberGrams;
        meal.IsPlantBased = c.IsPlantBased;
        meal.HasLegumes = c.HasLegumes;
        meal.HasWholeGrains = c.HasWholeGrains;
        meal.ContainsFish = c.ContainsFish;
        meal.AllergensCsv = string.Join(',', c.Allergens);
        meal.IngredientsCsv = string.Join(',', c.Ingredients);
        meal.DeterministicScore = scored.Score;
        meal.ReasonCodesCsv = string.Join(',', scored.ReasonCodes);
        meal.ExplanationSummary = BuildMealExplanation(c, scored.ReasonCodes, ruleSetVersion);
        meal.RegenerationCount = regenerationCount;
        meal.UpdatedAt = now;
    }

    private static MealPlanDay ClonePreservedDay(
        Guid newPlanId,
        Guid userId,
        int dayNumber,
        DateOnly planDate,
        MealPlanDay sourceDay,
        DateTimeOffset now)
    {
        var clonedDay = new MealPlanDay
        {
            Id = Guid.NewGuid(),
            MealPlanId = newPlanId,
            DayNumber = dayNumber,
            PlanDate = planDate,
            TargetCaloriesKcal = sourceDay.TargetCaloriesKcal,
            DailyFocusCode = sourceDay.DailyFocusCode,
            DailyFocusTitle = sourceDay.DailyFocusTitle,
        };

        foreach (var meal in sourceDay.Meals.OrderBy(m => m.SlotOrder))
        {
            clonedDay.Meals.Add(new PlannedMeal
            {
                Id = Guid.NewGuid(),
                MealPlanDayId = clonedDay.Id,
                MealPlanId = newPlanId,
                UserId = userId,
                SlotOrder = meal.SlotOrder,
                SlotType = meal.SlotType,
                PlannedTime = meal.PlannedTime,
                CandidateCode = meal.CandidateCode,
                Title = meal.Title,
                Description = meal.Description,
                Cuisine = meal.Cuisine,
                ServingSize = meal.ServingSize,
                ServingUnit = meal.ServingUnit,
                CaloriesKcal = meal.CaloriesKcal,
                ProteinGrams = meal.ProteinGrams,
                CarbsGrams = meal.CarbsGrams,
                FatGrams = meal.FatGrams,
                FiberGrams = meal.FiberGrams,
                IsPlantBased = meal.IsPlantBased,
                HasLegumes = meal.HasLegumes,
                HasWholeGrains = meal.HasWholeGrains,
                ContainsFish = meal.ContainsFish,
                AllergensCsv = meal.AllergensCsv,
                IngredientsCsv = meal.IngredientsCsv,
                DeterministicScore = meal.DeterministicScore,
                ReasonCodesCsv = meal.ReasonCodesCsv,
                ExplanationSummary = meal.ExplanationSummary,
                RegenerationCount = meal.RegenerationCount,
                UpdatedAt = now,
            });
        }

        return clonedDay;
    }

    private static List<(MealSlotType SlotType, TimeOnly PlannedTime)> ResolveMealSlots(
        int mealsPerDay,
        TimeOnly wakeTime,
        TimeOnly sleepTime)
    {
        var breakfastTime = AddMinutesClamped(wakeTime, 60, new TimeOnly(7, 30));
        var dinnerTime = SubtractMinutesBeforeSleep(sleepTime, 210, new TimeOnly(18, 30));

        if (dinnerTime <= breakfastTime)
        {
            breakfastTime = new TimeOnly(7, 30);
            dinnerTime = new TimeOnly(18, 30);
        }

        var windowSpanMinutes = (int)(dinnerTime - breakfastTime).TotalMinutes;
        var lunchTime = breakfastTime.AddMinutes(Math.Max(180, windowSpanMinutes / 2));
        var snackTime = breakfastTime.AddMinutes(Math.Max(300, (windowSpanMinutes * 3) / 4));

        return mealsPerDay switch
        {
            2 =>
            [
                (MealSlotType.Breakfast, breakfastTime),
                (MealSlotType.Dinner, dinnerTime)
            ],
            4 =>
            [
                (MealSlotType.Breakfast, breakfastTime),
                (MealSlotType.Lunch, lunchTime),
                (MealSlotType.Snack, snackTime),
                (MealSlotType.Dinner, dinnerTime)
            ],
            _ =>
            [
                (MealSlotType.Breakfast, breakfastTime),
                (MealSlotType.Lunch, lunchTime),
                (MealSlotType.Dinner, dinnerTime)
            ],
        };
    }

    private static TimeOnly AddMinutesClamped(TimeOnly baseTime, int minutesToAdd, TimeOnly fallback)
    {
        var totalMinutes = (baseTime.Hour * 60) + baseTime.Minute + minutesToAdd;
        if (totalMinutes is < 300 or > 660)
        {
            return fallback;
        }

        return new TimeOnly(totalMinutes / 60, totalMinutes % 60);
    }

    private static TimeOnly SubtractMinutesBeforeSleep(TimeOnly sleepTime, int minutesBefore, TimeOnly fallback)
    {
        var sleepMinutes = (sleepTime.Hour * 60) + sleepTime.Minute;
        if (sleepMinutes < 240)
        {
            sleepMinutes += 1440;
        }

        var targetMinutes = sleepMinutes - minutesBefore;
        if (targetMinutes is < 960 or > 1230)
        {
            return fallback;
        }

        return new TimeOnly((targetMinutes % 1440) / 60, targetMinutes % 60);
    }

    // Presentation-only translations: never change the canonical allergen/food
    // tokens used by the backend safety gates or the persisted data.
    private static string VietnameseFoodName(string value) => value.Trim().ToLowerInvariant() switch
    {
        "peanut" => "đậu phộng",
        "shellfish" => "tôm, cua và động vật có vỏ",
        "fish" => "cá",
        "milk" => "sữa",
        "egg" => "trứng",
        "soy" => "đậu nành",
        "wheat" => "lúa mì",
        "tree-nut" or "tree nuts" => "các loại hạt cây",
        "sesame" => "mè, vừng",
        "tofu" => "đậu phụ",
        "salmon" => "cá hồi",
        "mushroom" => "nấm",
        "cooked lentils" => "đậu lăng nấu chín",
        "cooked brown rice" => "gạo lứt nấu chín",
        "cooked salmon" => "cá hồi nấu chín",
        "steamed broccoli" => "bông cải xanh hấp",
        _ => value
    };

    private static string BuildPlanExplanation(
        PlanningUserContextSnapshot context,
        PlanningRuleSetSnapshot ruleSet,
        int daysCount)
    {
        var dietaryPattern = context.DietaryPattern switch
        {
            "PlantForward" => "ưu tiên thực vật, kết hợp nhóm thực phẩm phù hợp",
            "Pescatarian" => "chủ đạo thực vật, có thể kết hợp cá",
            "StrictlyPlantBased" => "hoàn toàn từ thực vật",
            _ => "theo lựa chọn đã lưu trong hồ sơ"
        };
        var allergyDescription = context.Allergies.Count > 0
            ? string.Join(", ", context.Allergies.Select(VietnameseFoodName))
            : "không có mục nào được khai báo";
        var exclusions = context.ExcludedFoods.Count > 0
            ? string.Join(", ", context.ExcludedFoods.Select(VietnameseFoodName))
            : "không có mục nào được khai báo";
        return $"Kế hoạch gợi ý {daysCount} ngày, dự kiến {context.PreferredMealFrequency} bữa mỗi ngày. " +
            $"Chế độ ăn: {dietaryPattern}. Dị ứng đã khai báo: {allergyDescription}. " +
            $"Thực phẩm cần loại trừ: {exclusions}. " +
            $"Món ăn được chọn từ danh mục hiện có theo bộ quy tắc phiên bản {ruleSet.RuleSetVersion}; " +
            "các điều kiện dị ứng và loại trừ được kiểm tra trước khi lưu. " +
            "Cách sử dụng: xem từng ngày, kiểm tra thành phần và khẩu phần của từng món; " +
            "có thể thay đổi món trong phạm vi danh mục được phép và ghi lại bữa ăn thực tế. " +
            "Giới hạn: số liệu dinh dưỡng chỉ phục vụ tham khảo, chưa được xác minh đầy đủ cho " +
            "nhu cầu cá nhân, nguy cơ tiếp xúc chéo hoặc tình trạng bệnh. " +
            "Không phải phác đồ điều trị và không dự đoán tuổi thọ.";
    }

    private static string BuildMealExplanation(
        PlanningCandidateMealSnapshot candidate,
        IReadOnlyList<string> reasonCodes,
        string ruleSetVersion)
    {
        var highlights = new List<string>();
        if (reasonCodes.Contains("PLANT_FORWARD", StringComparer.OrdinalIgnoreCase))
            highlights.Add("có thành phần chủ đạo từ thực vật");
        if (reasonCodes.Contains("LEGUME_PROTEIN", StringComparer.OrdinalIgnoreCase))
            highlights.Add("có các loại đậu");
        if (reasonCodes.Contains("COMPLEX_CARBS", StringComparer.OrdinalIgnoreCase))
            highlights.Add("có ngũ cốc nguyên hạt");
        if (reasonCodes.Contains("MODERATE_FISH", StringComparer.OrdinalIgnoreCase))
            highlights.Add("có cá, được tính trong giới hạn tần suất");
        if (reasonCodes.Contains("LOW_SUGAR_SATFAT", StringComparer.OrdinalIgnoreCase))
            highlights.Add("được ưu tiên theo tiêu chí đường và chất béo bão hòa");

        var why = highlights.Count > 0
            ? string.Join("; ", highlights)
            : "phù hợp với các điều kiện lựa chọn món trong danh mục";
        var ingredients = candidate.Ingredients.Count > 0
            ? string.Join(", ", candidate.Ingredients.Take(5).Select(VietnameseFoodName))
            : "chưa có danh sách thành phần chi tiết";
        return $"Vì sao chọn món này: {why}. " +
            $"Khẩu phần tham khảo: {candidate.ServingSize:0.##} {candidate.ServingUnit}; " +
            $"năng lượng {candidate.CaloriesKcal} kcal; đạm {candidate.ProteinGrams:0.##} g; " +
            $"tinh bột {candidate.CarbsGrams:0.##} g; chất béo {candidate.FatGrams:0.##} g; " +
            $"chất xơ {candidate.FiberGrams:0.##} g. " +
            $"Thành phần trong danh mục: {ingredients}. " +
            $"Tham chiếu bộ quy tắc phiên bản {ruleSetVersion}; ứng viên đã qua bộ lọc dị ứng " +
            "và thực phẩm loại trừ được khai báo. Hãy kiểm tra thành phần thực tế " +
            "và nguy cơ tiếp xúc chéo trước khi dùng.";
    }

    private static MealPlanSummary ToSummary(MealPlan plan)
    {
        var days = plan.Days
            .OrderBy(d => d.DayNumber)
            .Select(d =>
            {
                var meals = d.Meals
                    .OrderBy(m => m.SlotOrder)
                    .Select(m => new PlannedMealSummary(
                        m.Id,
                        m.MealPlanDayId,
                        m.SlotOrder,
                        m.SlotType.ToString(),
                        m.PlannedTime,
                        m.CandidateCode,
                        m.Title,
                        m.Description,
                        m.Cuisine,
                        m.ServingSize,
                        m.ServingUnit,
                        m.CaloriesKcal,
                        m.ProteinGrams,
                        m.CarbsGrams,
                        m.FatGrams,
                        m.FiberGrams,
                        m.IsPlantBased,
                        m.HasLegumes,
                        m.HasWholeGrains,
                        m.ContainsFish,
                        PlanningCatalogSnapshotProvider.SplitTokens(m.AllergensCsv),
                        PlanningCatalogSnapshotProvider.SplitTokens(m.IngredientsCsv),
                        m.DeterministicScore,
                        PlanningCatalogSnapshotProvider.SplitTokens(m.ReasonCodesCsv)
                            .Select(x => x.ToUpperInvariant())
                            .ToList(),
                        m.ExplanationSummary,
                        m.RegenerationCount))
                    .ToList();

                return new MealPlanDaySummary(
                    d.Id,
                    d.DayNumber,
                    d.PlanDate,
                    d.TargetCaloriesKcal,
                    meals.Sum(x => x.CaloriesKcal),
                    d.DailyFocusCode,
                    d.DailyFocusTitle,
                    meals);
            })
            .ToList();

        return new MealPlanSummary(
            plan.Id,
            plan.UserId,
            plan.RuleSetVersion,
            plan.RevisionNumber,
            plan.PreviousPlanId,
            plan.Status.ToString(),
            plan.StartDate,
            plan.EndDate,
            plan.MealsPerDay,
            plan.TimeZone,
            plan.DietaryPattern,
            PlanningCatalogSnapshotProvider.SplitTokens(plan.AppliedAllergiesCsv),
            PlanningCatalogSnapshotProvider.SplitTokens(plan.AppliedExclusionsCsv),
            PlanningCatalogSnapshotProvider.SplitTokens(plan.ReasonCodesCsv)
                .Select(x => x.ToUpperInvariant())
                .ToList(),
            plan.PlanExplanation,
            plan.GeneratedAt,
            plan.UpdatedAt,
            days);
    }

    private static string? NormalizeDietaryPattern(string? pattern)
    {
        if (string.IsNullOrWhiteSpace(pattern))
        {
            return "PlantForward";
        }

        var trimmed = pattern.Trim();
        if (!SupportedDietaryPatterns.Contains(trimmed))
        {
            return null;
        }

        if (string.Equals(trimmed, "Pescatarian", StringComparison.OrdinalIgnoreCase))
        {
            return "Pescatarian";
        }

        if (string.Equals(trimmed, "StrictlyPlantBased", StringComparison.OrdinalIgnoreCase))
        {
            return "StrictlyPlantBased";
        }

        return "PlantForward";
    }

    private static List<string> NormalizeTokens(IReadOnlyList<string>? values)
    {
        if (values is null || values.Count == 0)
        {
            return [];
        }

        return values
            .SelectMany(PlanningCatalogSnapshotProvider.SplitTokens)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(x => x, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static List<string> MergeTokens(
        IReadOnlyList<string> first,
        IReadOnlyList<string>? second)
    {
        if (second is null || second.Count == 0)
        {
            return NormalizeTokens(first);
        }

        return NormalizeTokens(first.Concat(second).ToList());
    }

    public static DateOnly ResolveLocalDate(DateTimeOffset timestamp, string timeZoneId)
    {
        var tz = ResolveTimeZone(timeZoneId);
        var local = TimeZoneInfo.ConvertTime(timestamp, tz);
        return DateOnly.FromDateTime(local.DateTime);
    }

    public static TimeZoneInfo ResolveTimeZone(string? timeZoneId)
    {
        if (string.IsNullOrWhiteSpace(timeZoneId))
        {
            return TimeZoneInfo.Utc;
        }

        var candidate = timeZoneId.Trim();
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(candidate);
        }
        catch (TimeZoneNotFoundException)
        {
            if (TimeZoneInfo.TryConvertIanaIdToWindowsId(candidate, out var windowsId))
            {
                return TimeZoneInfo.FindSystemTimeZoneById(windowsId);
            }

            if (TimeZoneInfo.TryConvertWindowsIdToIanaId(candidate, out var ianaId))
            {
                return TimeZoneInfo.FindSystemTimeZoneById(ianaId);
            }

            return TimeZoneInfo.Utc;
        }
        catch (InvalidTimeZoneException)
        {
            return TimeZoneInfo.Utc;
        }
    }

    public sealed record ScoredCandidate(
        PlanningCandidateMealSnapshot Candidate,
        decimal Score,
        IReadOnlyList<string> ReasonCodes);
}
