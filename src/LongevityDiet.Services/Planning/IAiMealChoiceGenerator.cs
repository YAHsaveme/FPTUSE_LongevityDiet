using LongevityDiet.Domain.Entities;

namespace LongevityDiet.Services.Planning;

/// <summary>
/// Optional local AI provides candidate IDs only, NEVER nutritional numbers,
/// allergens, health diagnoses, sources, or new recipes. The rule engine validates
/// every suggested candidate again before saving a plan.
/// </summary>
public sealed record AiMealChoiceOption(DateOnly Date, MealSlotType Slot,
    IReadOnlyList<AiAllowedCandidate> Candidates);

public sealed record AiAllowedCandidate(string Code, string Title,
    bool HasLegumes, bool HasWholeGrains, bool ContainsFish);

public sealed record AiMealChoice(DateOnly Date, MealSlotType Slot, string CandidateCode);

public interface IAiMealChoiceGenerator
{
    Task<IReadOnlyList<AiMealChoice>> SuggestAsync(
        IReadOnlyList<AiMealChoiceOption> allowedOptions,
        CancellationToken cancellationToken = default);
}
