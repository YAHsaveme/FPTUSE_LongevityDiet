using System.Text.Json;

namespace LongevityDiet.Domain.Catalog.Entities;

// Deterministic, append-only catalog composition snapshots; not a nutrition
// approval or an attribution to the source book.
public static class RecipeCompositionHistory
{
    public static RecipeCompositionRevision Capture(
        Recipe recipe, string changeType, DateTimeOffset at, Guid? actorId = null) =>
        new()
        {
            RecipeId = recipe.Id,
            RecordedAt = at.UtcDateTime,
            ChangeType = changeType,
            ActorId = actorId,
            SnapshotJson = JsonSerializer.Serialize(new
            {
                recipeId = recipe.Id,
                isActive = recipe.IsActive,
                ingredients = recipe.Ingredients.Where(i => !i.IsDeleted)
                    .OrderBy(i => i.FoodId)
                    .Select(i => new { foodId = i.FoodId, amount = i.Amount, unit = i.Unit, isOptional = i.IsOptional })
                    .ToArray(),
                allergens = recipe.Allergens.Where(a => !a.IsDeleted)
                    .OrderBy(a => a.AllergenId)
                    .Select(a => new { allergenId = a.AllergenId }).ToArray(),
            }),
        };
}
