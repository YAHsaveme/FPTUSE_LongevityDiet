using System.Security.Claims;
using LongevityDiet.Domain.Catalog.Entities;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace LongevityDiet.Catalog;

// Optional ADR-005 Catalog owner endpoints. Leave the default Gateway routes on
// the transitional runtime until its writer and consumers migrate together.
public static class CatalogRecipeEndpoints
{
    public static void MapRecipeOwnerEndpoints(this RouteGroupBuilder api, RouteGroupBuilder admin)
    {
        api.MapGet("/recipes/{id:guid}", async (Guid id, CatalogDbContext db, CancellationToken ct) =>
        {
            var recipe = await LoadAsync(db, id, includeInactive: false, ct);
            return recipe is null ? Results.NotFound() : Results.Ok(ToDetail(recipe));
        });

        admin.MapGet("/recipes", async (CatalogDbContext db, int page = 1,
            int pageSize = 20, CancellationToken ct = default) =>
        {
            if (!ValidPage(page, pageSize)) return Results.BadRequest(new { error = "invalid_pagination" });
            var query = db.Recipes.AsNoTracking();
            var total = await query.CountAsync(ct);
            var items = await query.OrderBy(r => r.NormalizedName).ThenBy(r => r.Id)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .Select(r => new { r.Id, r.Name, r.Category, r.IsActive, r.UpdatedAt })
                .ToListAsync(ct);
            return Results.Ok(new { items, totalItems = total, page, pageSize });
        });

        admin.MapGet("/recipes/{id:guid}/history", async (Guid id, CatalogDbContext db,
            int page = 1, int pageSize = 20, CancellationToken ct = default) =>
        {
            if (!ValidPage(page, pageSize)) return Results.BadRequest(new { error = "invalid_pagination" });
            if (!await db.Recipes.AsNoTracking().AnyAsync(r => r.Id == id, ct)) return Results.NotFound();
            var query = db.RecipeCompositionRevisions.AsNoTracking().Where(r => r.RecipeId == id);
            var count = await query.CountAsync(ct);
            var items = await query.OrderByDescending(r => r.RecordedAt).ThenByDescending(r => r.Id)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .Select(r => new { r.Id, r.RecipeId, r.RecordedAt, r.ChangeType, r.ActorId, r.SnapshotJson })
                .ToArrayAsync(ct);
            return Results.Ok(new { items, page, pageSize, totalItems = count,
                totalPages = (int)Math.Ceiling(count / (double)pageSize) });
        });

        admin.MapGet("/recipes/{id:guid}", async (Guid id, CatalogDbContext db, CancellationToken ct) =>
        {
            var recipe = await LoadAsync(db, id, includeInactive: true, ct);
            return recipe is null ? Results.NotFound() : Results.Ok(ToDetail(recipe));
        });

        admin.MapPost("/recipes", async (CatalogDbContext db, SaveCatalogRecipe input,
            HttpContext http, CancellationToken ct) =>
        {
            var error = await ValidateAsync(db, input, ct);
            if (error is not null) return Results.BadRequest(new { error });

            var now = DateTimeOffset.UtcNow;
            var recipe = new Recipe { CreatedAt = now, UpdatedAt = now, IsActive = true };
            ApplyRecipe(recipe, input);
            SyncIngredients(recipe, input, now);
            SyncAllergens(recipe, input, now);
            recipe.Revisions.Add(RecipeCompositionHistory.Capture(recipe, "Created", now, ActorId(http)));
            db.Recipes.Add(recipe);
            await db.SaveChangesAsync(ct);
            var saved = await LoadAsync(db, recipe.Id, includeInactive: true, ct);
            return Results.Created($"/api/v1/recipes/{recipe.Id}", ToDetail(saved!));
        });

        admin.MapPut("/recipes/{id:guid}", async (Guid id, CatalogDbContext db,
            SaveCatalogRecipe input, HttpContext http, CancellationToken ct) =>
        {
            var error = await ValidateAsync(db, input, ct);
            if (error is not null) return Results.BadRequest(new { error });
            var recipe = await db.Recipes.IgnoreQueryFilters().Include(r => r.Ingredients).Include(r => r.Allergens)
                .FirstOrDefaultAsync(r => r.Id == id && r.IsActive, ct);
            if (recipe is null) return Results.NotFound();

            var now = DateTimeOffset.UtcNow;
            ApplyRecipe(recipe, input);
            SyncIngredients(recipe, input, now);
            SyncAllergens(recipe, input, now);
            recipe.UpdatedAt = now;
            recipe.Revisions.Add(RecipeCompositionHistory.Capture(recipe, "Updated", now, ActorId(http)));
            await db.SaveChangesAsync(ct);
            var updated = await LoadAsync(db, id, includeInactive: true, ct);
            return Results.Ok(ToDetail(updated!));
        });

        admin.MapDelete("/recipes/{id:guid}", async (Guid id, CatalogDbContext db,
            HttpContext http, CancellationToken ct) =>
        {
            var recipe = await db.Recipes.FirstOrDefaultAsync(r => r.Id == id && r.IsActive, ct);
            if (recipe is null) return Results.NotFound();
            recipe.IsActive = false; // Historical plans keep the same stable recipe ID.
            var now = DateTimeOffset.UtcNow;
            recipe.UpdatedAt = now;
            // Capture the preserved active composition at deactivation time.
            var tracked = await db.Recipes.Include(r => r.Ingredients).Include(r => r.Allergens)
                .FirstAsync(r => r.Id == id, ct);
            tracked.Revisions.Add(RecipeCompositionHistory.Capture(tracked, "Deactivated", now, ActorId(http)));
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
    }

    private static Guid? ActorId(HttpContext http) =>
        Guid.TryParse(http.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
            http.User.FindFirst("sub")?.Value, out var actorId) ? actorId : null;

    private static bool ValidPage(int page, int pageSize) =>
        page >= 1 && pageSize is >= 1 and <= 100 &&
        (long)(page - 1) * pageSize <= int.MaxValue;

    private static Task<Recipe?> LoadAsync(CatalogDbContext db, Guid id,
        bool includeInactive, CancellationToken ct) =>
        db.Recipes.AsNoTracking().Include(r => r.Ingredients).ThenInclude(i => i.Food)
            .Include(r => r.Allergens).ThenInclude(a => a.Allergen)
            .FirstOrDefaultAsync(r => r.Id == id && (includeInactive || r.IsActive), ct);

    private static object ToDetail(Recipe r) => new
    {
        r.Id, r.Name, r.Description, r.Category, r.Cuisine, r.Tags,
        r.ServingCount, r.PrepMinutes, r.CaloriesPerServing, r.ProteinGPerServing,
        r.CarbohydrateGPerServing, r.FatGPerServing, r.SaturatedFatGPerServing,
        r.SugarGPerServing, r.FiberGPerServing, r.IsPlantForward, r.HasLegume,
        r.HasWholeGrain, r.HasFish, r.IsActive, r.CreatedAt, r.UpdatedAt,
        Ingredients = r.Ingredients.Where(x => !x.IsDeleted).OrderBy(x => x.Food.Name)
            .Select(x => new { x.FoodId, FoodName = x.Food.Name, x.Amount,
                x.Unit, x.IsOptional }).ToArray(),
        Allergens = r.Allergens.Where(x => !x.IsDeleted).OrderBy(x => x.Allergen.Code)
            .Select(x => new { x.AllergenId, x.Allergen.Code, x.Allergen.Name }).ToArray()
    };

    private static async Task<string?> ValidateAsync(CatalogDbContext db,
        SaveCatalogRecipe input, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(input.Name) || input.Name.Length > 180 ||
            string.IsNullOrWhiteSpace(input.Description) || input.Description.Length > 2000 ||
            string.IsNullOrWhiteSpace(input.Category) || input.Category.Length > 80 ||
            input.Cuisine?.Length > 100 || input.Tags?.Length > 500 ||
            input.ServingCount is < 1 or > 1000 || input.PrepMinutes is < 0 or > 10080)
            return "invalid_recipe";

        var values = new decimal[] { input.CaloriesPerServing, input.ProteinGPerServing,
            input.CarbohydrateGPerServing, input.FatGPerServing,
            input.SaturatedFatGPerServing ?? 0, input.SugarGPerServing ?? 0,
            input.FiberGPerServing ?? 0 };
        if (values.Any(v => v is < 0 or > 100000))
            return "invalid_nutrition";

        if (input.Ingredients is null || input.Ingredients.Count is < 1 or > 100 ||
            input.Ingredients.Any(i => i.FoodId == Guid.Empty ||
                i.Amount is <= 0 or > 100000 || string.IsNullOrWhiteSpace(i.Unit) ||
                i.Unit.Length > 40))
            return "invalid_ingredients";
        var foodIds = input.Ingredients.Select(i => i.FoodId).ToArray();
        if (foodIds.Distinct().Count() != foodIds.Length) return "duplicate_ingredient";
        var validFoods = await db.Foods.AsNoTracking()
            .CountAsync(f => f.IsActive && foodIds.Contains(f.Id), ct);
        if (validFoods != foodIds.Length) return "invalid_food_reference";

        if (input.AllergenIds is null || input.AllergenIds.Count > 50 ||
            input.AllergenIds.Any(id => id == Guid.Empty))
            return "invalid_allergens";
        var allergenIds = input.AllergenIds.ToArray();
        if (allergenIds.Distinct().Count() != allergenIds.Length) return "duplicate_allergen";
        if (allergenIds.Length != 0)
        {
            var validAllergens = await db.Allergens.AsNoTracking()
                .CountAsync(a => a.IsActive && allergenIds.Contains(a.Id), ct);
            if (validAllergens != allergenIds.Length) return "invalid_allergen_reference";
        }

        // Ingredient/allergen IDs must be owned by Catalog. There is no cross-DB FK.
        // A nonclinical synthetic recipe is not evidence of allergen cross-contact safety.
        return null;
    }

    private static void ApplyRecipe(Recipe recipe, SaveCatalogRecipe input)
    {
        recipe.Name = input.Name!.Trim();
        recipe.NormalizedName = recipe.Name.ToUpperInvariant();
        recipe.Description = input.Description!.Trim();
        recipe.Category = input.Category!.Trim();
        recipe.Cuisine = string.IsNullOrWhiteSpace(input.Cuisine) ? null : input.Cuisine.Trim();
        recipe.Tags = string.IsNullOrWhiteSpace(input.Tags) ? null : input.Tags.Trim();
        recipe.ServingCount = input.ServingCount;
        recipe.PrepMinutes = input.PrepMinutes;
        recipe.CaloriesPerServing = input.CaloriesPerServing;
        recipe.ProteinGPerServing = input.ProteinGPerServing;
        recipe.CarbohydrateGPerServing = input.CarbohydrateGPerServing;
        recipe.FatGPerServing = input.FatGPerServing;
        recipe.SaturatedFatGPerServing = input.SaturatedFatGPerServing;
        recipe.SugarGPerServing = input.SugarGPerServing;
        recipe.FiberGPerServing = input.FiberGPerServing;
        recipe.IsPlantForward = input.IsPlantForward;
        recipe.HasLegume = input.HasLegume;
        recipe.HasWholeGrain = input.HasWholeGrain;
        recipe.HasFish = input.HasFish;
    }

    private static void SyncIngredients(Recipe recipe, SaveCatalogRecipe input, DateTimeOffset now)
    {
        var requested = input.Ingredients!.ToDictionary(x => x.FoodId);
        foreach (var old in recipe.Ingredients.Where(x => !requested.ContainsKey(x.FoodId) && !x.IsDeleted))
        {
            old.IsDeleted = true;
            old.DeletedAt = now;
        }
        foreach (var ingredient in requested.Values)
        {
            var current = recipe.Ingredients.SingleOrDefault(x => x.FoodId == ingredient.FoodId);
            if (current is null)
            {
                current = new RecipeIngredient { RecipeId = recipe.Id, FoodId = ingredient.FoodId };
                recipe.Ingredients.Add(current);
            }
            current.Amount = ingredient.Amount;
            current.Unit = ingredient.Unit!.Trim();
            current.IsOptional = ingredient.IsOptional;
            current.IsDeleted = false;
            current.DeletedAt = null;
        }
    }

    private static void SyncAllergens(Recipe recipe, SaveCatalogRecipe input, DateTimeOffset now)
    {
        var ids = input.AllergenIds!.ToHashSet();
        foreach (var old in recipe.Allergens.Where(x => !ids.Contains(x.AllergenId) && !x.IsDeleted))
        {
            old.IsDeleted = true;
            old.DeletedAt = now;
        }
        foreach (var id in ids)
        {
            var existing = recipe.Allergens.SingleOrDefault(x => x.AllergenId == id);
            if (existing is null)
                recipe.Allergens.Add(new RecipeAllergen { RecipeId = recipe.Id, AllergenId = id });
            else
            {
                existing.IsDeleted = false;
                existing.DeletedAt = null;
            }
        }
    }
}

public sealed record SaveCatalogRecipe(
    string? Name, string? Description, string? Category, string? Cuisine, string? Tags,
    int ServingCount, int PrepMinutes, decimal CaloriesPerServing, decimal ProteinGPerServing,
    decimal CarbohydrateGPerServing, decimal FatGPerServing, decimal? SaturatedFatGPerServing,
    decimal? SugarGPerServing, decimal? FiberGPerServing, bool IsPlantForward,
    bool HasLegume, bool HasWholeGrain, bool HasFish,
    IReadOnlyList<SaveCatalogRecipeIngredient>? Ingredients, IReadOnlyList<Guid>? AllergenIds);

public sealed record SaveCatalogRecipeIngredient(
    Guid FoodId, decimal Amount, string? Unit, bool IsOptional);
