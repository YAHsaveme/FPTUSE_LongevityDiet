using System.Security.Claims;
using System.Text;
using LongevityDiet.Catalog;
using LongevityDiet.Domain.Catalog;
using LongevityDiet.Domain.Catalog.Entities;
using LongevityDiet.Repositories.Catalog.Seed;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var connection = builder.Configuration.GetConnectionString("Catalog");
if (string.IsNullOrWhiteSpace(connection))
    throw new InvalidOperationException("ConnectionStrings:Catalog is required.");

var dbName = new SqlConnectionStringBuilder(connection).InitialCatalog;
if (!string.Equals(dbName, "LongevityCatalogDb", StringComparison.OrdinalIgnoreCase))
    throw new InvalidOperationException("Catalog service may connect only to LongevityCatalogDb.");

var issuer = builder.Configuration["Jwt:Issuer"];
var audience = builder.Configuration["Jwt:Audience"];
var signingKey = builder.Configuration["Jwt:SigningKey"];
if (string.IsNullOrWhiteSpace(issuer) || string.IsNullOrWhiteSpace(audience) ||
    string.IsNullOrWhiteSpace(signingKey) || Encoding.UTF8.GetByteCount(signingKey) < 32)
    throw new InvalidOperationException("Trusted JWT issuer, audience and signing key are required.");

builder.Services.AddDbContext<CatalogDbContext>(options =>
    options.UseSqlServer(connection, sql => sql.EnableRetryOnFailure()));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = issuer,
            ValidateAudience = true,
            ValidAudience = audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = ClaimTypes.Name,
            RoleClaimType = ClaimTypes.Role
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddProblemDetails();

var app = builder.Build();
app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();

// Development-only bootstrap of the catalog-owned database. No cross-domain
// reads, writes, shared DbContext, or migrations against the legacy database.
if (app.Environment.IsDevelopment())
{
    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
    await db.Database.MigrateAsync();
    await CatalogSeed.SeedAsync(db);
}

app.MapGet("/health", () => Results.Ok(new { service = "catalog", status = "alive" }));
app.MapGet("/ready", async (CatalogDbContext db, CancellationToken ct) =>
{
    try
    {
        _ = await db.Foods.AsNoTracking().AnyAsync(ct);
        return Results.Ok(new { service = "catalog", database = "LongevityCatalogDb", status = "ready" });
    }
    catch (Exception)
    {
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }
});

var api = app.MapGroup("/api/v1").RequireAuthorization();
api.MapGet("/foods", async (
    CatalogDbContext db, int page = 1, int pageSize = 20,
    string? search = null, string? category = null, bool? isPlantBased = null,
    string sortBy = "name", string sortDirection = "asc", CancellationToken ct = default) =>
{
    if (page < 1 || pageSize is < 1 or > 100 ||
        !(sortBy.Equals("name", StringComparison.OrdinalIgnoreCase) || sortBy.Equals("category", StringComparison.OrdinalIgnoreCase) || sortBy.Equals("calories", StringComparison.OrdinalIgnoreCase) || sortBy.Equals("createdAt", StringComparison.OrdinalIgnoreCase)) ||
        !(sortDirection.Equals("asc", StringComparison.OrdinalIgnoreCase) || sortDirection.Equals("desc", StringComparison.OrdinalIgnoreCase)))
        return Results.BadRequest(new { error = "invalid_query" });

    var foods = db.Foods.AsNoTracking().Where(x => x.IsActive);
    if (!string.IsNullOrWhiteSpace(search))
    {
        var value = search.Trim();
        foods = foods.Where(x => x.Name.Contains(value));
    }
    if (!string.IsNullOrWhiteSpace(category)) foods = foods.Where(x => x.Category == category.Trim());
    if (isPlantBased.HasValue) foods = foods.Where(x => x.IsPlantBased == isPlantBased.Value);

    var desc = sortDirection.Equals("desc", StringComparison.OrdinalIgnoreCase);
    foods = sortBy.ToLowerInvariant() switch
    {
        "calories" => desc ? foods.OrderByDescending(x => x.Calories).ThenBy(x => x.Id)
                           : foods.OrderBy(x => x.Calories).ThenBy(x => x.Id),
        "category" => desc ? foods.OrderByDescending(x => x.Category).ThenBy(x => x.Id)
                           : foods.OrderBy(x => x.Category).ThenBy(x => x.Id),
        "createdat" => desc ? foods.OrderByDescending(x => x.CreatedAt).ThenBy(x => x.Id)
                            : foods.OrderBy(x => x.CreatedAt).ThenBy(x => x.Id),
        _ => desc ? foods.OrderByDescending(x => x.NormalizedName).ThenBy(x => x.Id)
                  : foods.OrderBy(x => x.NormalizedName).ThenBy(x => x.Id)
    };

    var total = await foods.CountAsync(ct);
    var items = await foods.Skip((page - 1) * pageSize).Take(pageSize)
        .Select(x => new { x.Id, x.Name, x.Category, x.Tags, x.Cuisine,
            x.DefaultServingAmount, x.ServingUnit, x.Calories, x.ProteinG,
            x.CarbohydrateG, x.FatG, x.SaturatedFatG, x.SugarG, x.FiberG,
            x.IsPlantBased, x.IsLegume, x.IsWholeGrain, x.IsFish, x.IsActive,
            x.CreatedAt, x.UpdatedAt }).ToListAsync(ct);
    return Results.Ok(new { items, page, pageSize, totalItems = total,
        totalPages = (int)Math.Ceiling(total / (double)pageSize) });
});

api.MapGet("/foods/{id:guid}", async (Guid id, CatalogDbContext db, CancellationToken ct) =>
{
    var food = await db.Foods.AsNoTracking().Where(x => x.Id == id && x.IsActive)
        .Select(x => new { x.Id, x.Name, x.Category, x.Calories, x.ProteinG,
            x.CarbohydrateG, x.FatG, x.IsPlantBased, x.IsLegume, x.IsWholeGrain, x.IsFish })
        .FirstOrDefaultAsync(ct);
    return food is null ? Results.NotFound() : Results.Ok(food);
});

api.MapGet("/recipes", async (CatalogDbContext db, int page = 1, int pageSize = 20,
    string? search = null, CancellationToken ct = default) =>
{
    if (page < 1 || pageSize is < 1 or > 100) return Results.BadRequest();
    var recipes = db.Recipes.AsNoTracking().Where(x => x.IsActive);
    if (!string.IsNullOrWhiteSpace(search))
    {
        var term = search.Trim();
        recipes = recipes.Where(x => x.Name.Contains(term));
    }
    var total = await recipes.CountAsync(ct);
    var items = await recipes.OrderBy(x => x.NormalizedName).ThenBy(x => x.Id)
        .Skip((page - 1) * pageSize).Take(pageSize)
        .Select(x => new { x.Id, x.Name, x.Description, x.Category, x.Cuisine,
            x.CaloriesPerServing, x.ProteinGPerServing, x.CarbohydrateGPerServing,
            x.FatGPerServing, x.IsPlantForward, x.HasLegume, x.HasWholeGrain, x.HasFish })
        .ToListAsync(ct);
    return Results.Ok(new { items, page, pageSize, totalItems = total });
});

api.MapGet("/diet-rules", async (CatalogDbContext db, CancellationToken ct) =>
    Results.Ok(await db.DietRules.AsNoTracking().Where(x => x.IsActive &&
        x.Versions.Any(v => v.State == RuleVersionState.Published))
        .OrderBy(x => x.RuleKey)
        .Select(x => new { x.Id, x.RuleKey, x.Title, x.Description,
            x.Category, x.IsMedicalSensitive })
        .ToListAsync(ct)));

var admin = api.MapGroup("/admin").RequireAuthorization(policy => policy.RequireRole("Admin"));
admin.MapPost("/foods", async (CatalogDbContext db, SaveFood input, CancellationToken ct) =>
{
    var name = input.Name?.Trim();
    var category = input.Category?.Trim();
    if (string.IsNullOrWhiteSpace(name) || name.Length > 180 ||
        string.IsNullOrWhiteSpace(category) || category.Length > 80 ||
        input.Calories is < 0 or > 100000 || input.ProteinG < 0 ||
        input.CarbohydrateG < 0 || input.FatG < 0)
        return Results.BadRequest(new { error = "invalid_food" });

    var entity = new Food
    {
        Name = name, NormalizedName = name.ToUpperInvariant(), Category = category,
        ServingUnit = "g", DefaultServingAmount = 100,
        Calories = input.Calories, ProteinG = input.ProteinG,
        CarbohydrateG = input.CarbohydrateG, FatG = input.FatG,
        IsPlantBased = input.IsPlantBased, IsActive = true,
        CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow
    };
    db.Foods.Add(entity);
    await db.SaveChangesAsync(ct);
    return Results.Created($"/api/v1/foods/{entity.Id}", new { entity.Id, entity.Name });
});
admin.MapPut("/foods/{id:guid}", async (Guid id, CatalogDbContext db, SaveFood input, CancellationToken ct) =>
{
    var name = input.Name?.Trim();
    var category = input.Category?.Trim();
    if (string.IsNullOrWhiteSpace(name) || name.Length > 180 ||
        string.IsNullOrWhiteSpace(category) || category.Length > 80 ||
        input.Calories is < 0 or > 100000 || input.ProteinG < 0 ||
        input.CarbohydrateG < 0 || input.FatG < 0)
        return Results.BadRequest(new { error = "invalid_food" });

    var food = await db.Foods.FirstOrDefaultAsync(x => x.Id == id && x.IsActive, ct);
    if (food is null) return Results.NotFound();

    food.Name = name;
    food.NormalizedName = name.ToUpperInvariant();
    food.Category = category;
    food.Calories = input.Calories;
    food.ProteinG = input.ProteinG;
    food.CarbohydrateG = input.CarbohydrateG;
    food.FatG = input.FatG;
    food.IsPlantBased = input.IsPlantBased;
    food.UpdatedAt = DateTimeOffset.UtcNow;
    await db.SaveChangesAsync(ct);
    return Results.Ok(new { food.Id, food.Name, food.Category, food.Calories,
        food.ProteinG, food.CarbohydrateG, food.FatG, food.IsPlantBased });
});

admin.MapDelete("/foods/{id:guid}", async (Guid id, CatalogDbContext db, CancellationToken ct) =>
{
    var food = await db.Foods.FirstOrDefaultAsync(x => x.Id == id && x.IsActive, ct);
    if (food is null) return Results.NotFound();
    // Do not silently invalidate an active recipe that still uses this ingredient.
    if (await db.RecipeIngredients.AnyAsync(x => x.FoodId == id && x.Recipe.IsActive, ct))
        return Results.Conflict(new { error = "food_used_by_active_recipe" });
    food.IsActive = false;
    food.UpdatedAt = DateTimeOffset.UtcNow;
    await db.SaveChangesAsync(ct);
    return Results.NoContent();
});

api.MapRecipeOwnerEndpoints(admin);
api.MapRuleOwnerEndpoints(admin);

app.Run();

public partial class Program;
