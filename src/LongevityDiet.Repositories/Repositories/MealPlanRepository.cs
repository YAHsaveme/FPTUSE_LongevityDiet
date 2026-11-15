using LongevityDiet.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LongevityDiet.Repositories.Repositories;

public sealed class MealPlanRepository(LongevityDietDbContext dbContext) : IMealPlanRepository
{
    public async Task<MealPlan?> GetActiveByUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var plans = await dbContext.MealPlans
            .Include(x => x.Days)
                .ThenInclude(d => d.Meals)
            .Where(x => x.UserId == userId && x.Status == MealPlanStatus.Active)
            .ToListAsync(cancellationToken);

        return plans
            .OrderByDescending(x => x.RevisionNumber)
            .ThenByDescending(x => x.GeneratedAt)
            .FirstOrDefault();
    }

    public async Task<IReadOnlyList<MealPlan>> GetAllActiveByUserForUpdateAsync(
        Guid userId, CancellationToken cancellationToken = default) =>
        await dbContext.MealPlans
            .Where(x => x.UserId == userId && x.Status == MealPlanStatus.Active)
            .ToListAsync(cancellationToken);

    public async Task<MealPlan?> GetByIdForUserAsync(
        Guid planId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        return await dbContext.MealPlans
            .Include(x => x.Days)
                .ThenInclude(d => d.Meals)
            .FirstOrDefaultAsync(
                x => x.Id == planId && x.UserId == userId,
                cancellationToken);
    }

    public async Task<IReadOnlyList<MealPlan>> ListByUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var plans = await dbContext.MealPlans
            .AsNoTracking()
            .Include(x => x.Days)
                .ThenInclude(d => d.Meals)
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.RevisionNumber)
            .Take(20)
            .ToListAsync(cancellationToken);

        return plans
            .OrderByDescending(x => x.GeneratedAt)
            .ThenByDescending(x => x.RevisionNumber)
            .ToList();
    }

    public async Task<PagedRepositoryItems<MealPlan>> QueryPlansAsync(
        Guid userId, HistoryPageQuery options, CancellationToken cancellationToken = default)
    {
        var source = dbContext.MealPlans.AsNoTracking().Where(x => x.UserId == userId);
        if (!string.IsNullOrWhiteSpace(options.Search))
            source = source.Where(x => x.DietaryPattern.Contains(options.Search));
        if (options.FromDate.HasValue)
            source = source.Where(x => x.StartDate >= options.FromDate.Value);
        if (options.ToDate.HasValue)
            source = source.Where(x => x.StartDate <= options.ToDate.Value);
        if (!string.IsNullOrWhiteSpace(options.Status) &&
            Enum.TryParse<MealPlanStatus>(options.Status, true, out var status))
            source = source.Where(x => x.Status == status);
        var total = await source.CountAsync(cancellationToken);
        // The SQLite integration-test provider cannot translate DateTimeOffset ORDER BY.
        // Production SQL Server still performs sorting and pagination in SQL.
        if ((dbContext.Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) == true) &&
            options.SortBy.Equals("generatedAt", StringComparison.OrdinalIgnoreCase))
        {
            var sqliteRows = await source.Include(x => x.Days).ThenInclude(d => d.Meals)
                .ToListAsync(cancellationToken);
            var ordered = (options.Descending
                ? sqliteRows.OrderByDescending(x => x.GeneratedAt)
                : sqliteRows.OrderBy(x => x.GeneratedAt)).ThenBy(x => x.Id);
            return new PagedRepositoryItems<MealPlan>(ordered
                .Skip((options.Page - 1) * options.PageSize).Take(options.PageSize).ToList(), total);
        }

        var sorted = (options.SortBy.ToLowerInvariant(), options.Descending) switch
        {
            ("startdate", false) => source.OrderBy(x => x.StartDate).ThenBy(x => x.Id),
            ("startdate", true) => source.OrderByDescending(x => x.StartDate).ThenBy(x => x.Id),
            ("revisionnumber", false) => source.OrderBy(x => x.RevisionNumber).ThenBy(x => x.Id),
            ("revisionnumber", true) => source.OrderByDescending(x => x.RevisionNumber).ThenBy(x => x.Id),
            ("generatedat", false) => source.OrderBy(x => x.GeneratedAt).ThenBy(x => x.Id),
            _ => source.OrderByDescending(x => x.GeneratedAt).ThenBy(x => x.Id),
        };
        var items = await sorted
            .Include(x => x.Days).ThenInclude(d => d.Meals)
            .AsSplitQuery()
            .Skip((options.Page - 1) * options.PageSize).Take(options.PageSize)
            .ToListAsync(cancellationToken);
        return new PagedRepositoryItems<MealPlan>(items, total);
    }

    public Task<UserDietaryPreference?> GetDietaryPreferenceAsync(
        Guid userId,
        CancellationToken cancellationToken = default) =>
        dbContext.UserDietaryPreferences
            .FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);

    public async Task UpsertDietaryPreferenceAsync(
        UserDietaryPreference preference,
        CancellationToken cancellationToken = default)
    {
        var existing = await dbContext.UserDietaryPreferences
            .FirstOrDefaultAsync(x => x.UserId == preference.UserId, cancellationToken);

        if (existing is null)
        {
            await dbContext.UserDietaryPreferences.AddAsync(preference, cancellationToken);
            return;
        }

        existing.DietaryPattern = preference.DietaryPattern;
        existing.AllergiesCsv = preference.AllergiesCsv;
        existing.ExcludedFoodsCsv = preference.ExcludedFoodsCsv;
        existing.PreferredCuisine = preference.PreferredCuisine;
        existing.UpdatedAt = preference.UpdatedAt;
    }

    public async Task AddAsync(MealPlan mealPlan, CancellationToken cancellationToken = default)
    {
        await dbContext.MealPlans.AddAsync(mealPlan, cancellationToken);
    }

    public async Task AddPlannedMealAsync(PlannedMeal meal, CancellationToken cancellationToken = default) =>
        await dbContext.PlannedMeals.AddAsync(meal, cancellationToken);

    public void RemovePlannedMeal(PlannedMeal meal)
    {
        meal.IsDeleted = true;
        meal.DeletedAt ??= DateTimeOffset.UtcNow;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
