using LongevityDiet.API.Contracts.Planning;
using LongevityDiet.API.Contracts.Recommendation;
using LongevityDiet.API.Errors;
using LongevityDiet.API.Security;
using LongevityDiet.Services.Planning;
using LongevityDiet.Services.Recommendation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LongevityDiet.API.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/meal-plans")]
public sealed class MealPlansController(
    MealPlanningService mealPlanningService,
    RecommendationService recommendationService,
    ICurrentUser currentUser) : ControllerBase
{
    [HttpGet("preferences")]
    [ProducesResponseType<DietaryPreferenceResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DietaryPreferenceResponse>> GetPreferences(
        CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId)
        {
            return Unauthorized();
        }

        var result = await mealPlanningService.GetDietaryPreferenceAsync(userId, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return this.ToProblem(result, StatusCodes.Status404NotFound);
        }

        return Ok(ToPreferenceResponse(result.Value));
    }

    [HttpPut("preferences")]
    [ProducesResponseType<DietaryPreferenceResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<DietaryPreferenceResponse>> UpdatePreferences(
        UpdateDietaryPreferenceRequest request,
        CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId)
        {
            return Unauthorized();
        }

        var result = await mealPlanningService.UpdateDietaryPreferenceAsync(
            userId,
            new UpdateDietaryPreferenceCommand(
                request.DietaryPattern,
                request.Allergies ?? [],
                request.ExcludedFoods ?? [],
                request.PreferredCuisine),
            cancellationToken);

        if (!result.Succeeded || result.Value is null)
        {
            return this.ToProblem(result);
        }

        return Ok(ToPreferenceResponse(result.Value));
    }

    [HttpGet("candidates")]
    [ProducesResponseType<IReadOnlyList<CandidateMealResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IReadOnlyList<CandidateMealResponse>>> GetCandidates(
        CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null)
        {
            return Unauthorized();
        }

        var result = await mealPlanningService.GetActiveCandidatesAsync(cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return this.ToProblem(result);
        }

        var items = result.Value
            .Select(c => new CandidateMealResponse(
                c.CandidateCode,
                c.Title,
                c.Description,
                c.Category,
                c.Cuisine,
                c.SupportedSlots.Select(s => s.ToString()).ToList(),
                c.ServingSize,
                c.ServingUnit,
                c.CaloriesKcal,
                c.ProteinGrams,
                c.CarbsGrams,
                c.FatGrams,
                c.FiberGrams,
                c.IsPlantBased,
                c.HasLegumes,
                c.HasWholeGrains,
                c.ContainsFish,
                c.Allergens,
                c.Ingredients))
            .ToList();

        return Ok(items);
    }

    [HttpGet]
    [ProducesResponseType<IReadOnlyList<MealPlanResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IReadOnlyList<MealPlanResponse>>> ListPlans(
        CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId)
        {
            return Unauthorized();
        }

        var result = await mealPlanningService.ListPlansAsync(userId, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return this.ToProblem(result);
        }

        return Ok(result.Value.Select(ToResponse).ToList());
    }

    [HttpGet("current")]
    [ProducesResponseType<MealPlanResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MealPlanResponse>> GetCurrentPlan(
        CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId)
        {
            return Unauthorized();
        }

        var result = await mealPlanningService.GetCurrentPlanAsync(userId, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return this.ToProblem(
                result,
                result.ErrorCode == "meal_plan_not_found"
                    ? StatusCodes.Status404NotFound
                    : StatusCodes.Status400BadRequest);
        }

        return Ok(ToResponse(result.Value));
    }

    [HttpPost("ensure-current")]
    [ProducesResponseType<MealPlanResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> EnsureCurrent(CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId) return Unauthorized();
        var result = await mealPlanningService.EnsureDailyCoverageAsync(userId, cancellationToken);
        return result.Succeeded && result.Value is not null
            ? Ok(ToResponse(result.Value)) : this.ToProblem(result);
    }

    [HttpGet("{planId:guid}")]
    [ProducesResponseType<MealPlanResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MealPlanResponse>> GetPlanById(
        Guid planId,
        CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId)
        {
            return Unauthorized();
        }

        var result = await mealPlanningService.GetPlanByIdAsync(userId, planId, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return this.ToProblem(result, StatusCodes.Status404NotFound);
        }

        return Ok(ToResponse(result.Value));
    }

    [HttpGet("ai-status")]
    public IActionResult GetAiStatus() => Ok(new
    {
        enabled = mealPlanningService.IsAiConfigured,
        provider = mealPlanningService.IsAiConfigured ? "LocalOllama" : "None",
        description = mealPlanningService.IsAiConfigured
            ? "AI đề xuất mã món từ danh mục đã lọc theo dị ứng, hệ thống xác thực lại trước khi lưu."
            : "Mô hình AI chưa được cấu hình. Bạn vẫn có thể tạo thực đơn theo quy tắc nguồn chính thức."
    });

    [HttpPost]
    [HttpPost("generate")]
    [ProducesResponseType<MealPlanResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<MealPlanResponse>> GeneratePlan(
        GenerateMealPlanRequest? request,
        CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId)
        {
            return Unauthorized();
        }

        var effectiveRequest = request ?? new GenerateMealPlanRequest(null);
        var result = await mealPlanningService.GeneratePlanAsync(
            userId,
            new GenerateMealPlanCommand(
                effectiveRequest.StartDate,
                effectiveRequest.Days,
                effectiveRequest.DietaryPattern,
                effectiveRequest.Allergies,
                effectiveRequest.ExcludedFoods,
                effectiveRequest.PreferredCuisine,
                effectiveRequest.UseAi),
            cancellationToken);

        if (!result.Succeeded || result.Value is null)
        {
            return this.ToProblem(result);
        }

        var response = ToResponse(result.Value);
        return CreatedAtAction(nameof(GetPlanById), new { planId = response.Id }, response);
    }

    [HttpPost("{planId:guid}/regenerate")]
    [ProducesResponseType<MealPlanResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<MealPlanResponse>> RegeneratePlan(
        Guid planId,
        RegenerateMealPlanRequest? request,
        CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId)
        {
            return Unauthorized();
        }

        var result = await mealPlanningService.RegeneratePlanAsync(
            userId,
            planId,
            new RegenerateMealPlanCommand(request?.FromDate),
            cancellationToken);

        if (!result.Succeeded || result.Value is null)
        {
            return this.ToProblem(result);
        }

        return Ok(ToResponse(result.Value));
    }

    [HttpPost("{planId:guid}/meals/{plannedMealId:guid}/regenerate")]
    [ProducesResponseType<MealPlanResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<MealPlanResponse>> RegeneratePlannedMeal(
        Guid planId,
        Guid plannedMealId,
        RegeneratePlannedMealRequest? request,
        CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId)
        {
            return Unauthorized();
        }

        var result = await mealPlanningService.RegeneratePlannedMealAsync(
            userId,
            planId,
            plannedMealId,
            new RegeneratePlannedMealCommand(request?.AdditionalExcludedCodes),
            cancellationToken);

        if (!result.Succeeded || result.Value is null)
        {
            return this.ToProblem(result);
        }

        return Ok(ToResponse(result.Value));
    }

    [HttpPost("{planId:guid}/meals/{plannedMealId:guid}/replace")]
    public async Task<IActionResult> ReplacePlannedMeal(
        Guid planId,
        Guid plannedMealId,
        [FromBody] ReplacePlanMealByRouteRequest? request,
        CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId)
        {
            return Unauthorized();
        }

        var result = await recommendationService.ReplacePlannedMealAsync(
            userId,
            new ReplacePlannedMealCommand(
                planId,
                plannedMealId,
                request?.TargetCandidateCode,
                request?.ReplacementReasonCode,
                request?.ReasonNotes,
                request?.AdditionalExcludedCodes),
            cancellationToken);

        return result.Succeeded ? Ok(result.Value) : this.ToProblem(result);
    }

    [HttpPost("{planId:guid}/days/{dayId:guid}/meals")]
    [ProducesResponseType<MealPlanResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<MealPlanResponse>> AddMeal(
        Guid planId, Guid dayId, SavePlannedMealRequest request,
        CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId) return Unauthorized();
        var result = await mealPlanningService.AddPlannedMealAsync(userId, planId, dayId,
            new SavePlannedMealCommand(request.CandidateCode, request.SlotType, request.PlannedTime),
            cancellationToken);
        return result.Succeeded && result.Value is not null
            ? CreatedAtAction(nameof(GetPlanById), new { planId }, ToResponse(result.Value))
            : this.ToProblem(result);
    }

    [HttpPut("{planId:guid}/meals/{plannedMealId:guid}")]
    [ProducesResponseType<MealPlanResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<MealPlanResponse>> UpdateMeal(
        Guid planId, Guid plannedMealId, SavePlannedMealRequest request,
        CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId) return Unauthorized();
        var result = await mealPlanningService.UpdatePlannedMealAsync(userId, planId, plannedMealId,
            new SavePlannedMealCommand(request.CandidateCode, request.SlotType, request.PlannedTime),
            cancellationToken);
        return result.Succeeded && result.Value is not null
            ? Ok(ToResponse(result.Value))
            : this.ToProblem(result);
    }

    [HttpDelete("{planId:guid}/meals/{plannedMealId:guid}")]
    [ProducesResponseType<MealPlanResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<MealPlanResponse>> DeleteMeal(
        Guid planId, Guid plannedMealId, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId) return Unauthorized();
        var result = await mealPlanningService.DeletePlannedMealAsync(
            userId, planId, plannedMealId, cancellationToken);
        return result.Succeeded && result.Value is not null
            ? Ok(ToResponse(result.Value))
            : this.ToProblem(result);
    }

    /// <summary>Soft-delete a meal plan; earlier revisions remain available in history.</summary>
    [HttpDelete("{planId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ArchivePlan(Guid planId, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId) return Unauthorized();
        var result = await mealPlanningService.ArchivePlanAsync(userId, planId, cancellationToken);
        return result.Succeeded ? NoContent() : this.ToProblem(result);
    }

    [HttpGet("{planId:guid}/replacements")]
    public async Task<IActionResult> GetPlanReplacements(
        Guid planId,
        [FromQuery] int limit = 50,
        CancellationToken cancellationToken = default)
    {
        if (currentUser.UserId is not { } userId)
        {
            return Unauthorized();
        }

        var result = await recommendationService.ListReplacementHistoryAsync(userId, planId, limit, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : this.ToProblem(result);
    }

    private static DietaryPreferenceResponse ToPreferenceResponse(DietaryPreferenceSummary summary) =>
        new(
            summary.UserId,
            summary.DietaryPattern,
            summary.Allergies,
            summary.ExcludedFoods,
            summary.PreferredCuisine,
            summary.UpdatedAt);

    private static MealPlanResponse ToResponse(MealPlanSummary summary) =>
        new(
            summary.Id,
            summary.UserId,
            summary.RuleSetVersion,
            summary.RevisionNumber,
            summary.PreviousPlanId,
            summary.Status,
            summary.StartDate,
            summary.EndDate,
            summary.MealsPerDay,
            summary.TimeZone,
            summary.DietaryPattern,
            summary.AppliedAllergies,
            summary.AppliedExclusions,
            summary.ReasonCodes,
            summary.PlanExplanation,
            summary.GeneratedAt,
            summary.UpdatedAt,
            summary.Days
                .Select(d => new MealPlanDayResponse(
                    d.Id,
                    d.DayNumber,
                    d.PlanDate,
                    d.TargetCaloriesKcal,
                    d.TotalPlannedCaloriesKcal,
                    d.DailyFocusCode,
                    d.DailyFocusTitle,
                    d.Meals
                        .Select(m => new PlannedMealResponse(
                            m.Id,
                            m.MealPlanDayId,
                            m.SlotOrder,
                            m.SlotType,
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
                            m.Allergens,
                            m.Ingredients,
                            m.DeterministicScore,
                            m.ReasonCodes,
                            m.ExplanationSummary,
                            m.RegenerationCount))
                        .ToList()))
                .ToList());
}
