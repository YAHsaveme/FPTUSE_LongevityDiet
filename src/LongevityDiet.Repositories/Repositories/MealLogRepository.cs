using LongevityDiet.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LongevityDiet.Repositories.Repositories;

public sealed class MealLogRepository(LongevityDietDbContext dbContext) : IMealLogRepository
{
    public Task<MealLog?> GetByIdForUserAsync(
        Guid logId,
        Guid userId,
        CancellationToken cancellationToken = default) =>
        dbContext.MealLogs
            .Include(x => x.Items)
            .FirstOrDefaultAsync(
                x => x.Id == logId && x.UserId == userId && !x.IsDeleted,
                cancellationToken);

    public async Task<PagedRepositoryItems<MealLog>> QueryAsync(
        Guid userId, HistoryPageQuery options, CancellationToken cancellationToken = default)
    {
        var source = dbContext.MealLogs.AsNoTracking()
            .Where(x => x.UserId == userId && !x.IsDeleted);
        if (options.FromDate.HasValue)
            source = source.Where(x => x.LocalDate >= options.FromDate.Value);
        if (options.ToDate.HasValue)
            source = source.Where(x => x.LocalDate <= options.ToDate.Value);
        if (!string.IsNullOrWhiteSpace(options.Search))
            source = source.Where(x => x.Title.Contains(options.Search));
        if (!string.IsNullOrWhiteSpace(options.SlotType) &&
            Enum.TryParse<MealSlotType>(options.SlotType, true, out var slot))
            source = source.Where(x => x.MealType == slot);

        var total = await source.CountAsync(cancellationToken);
        // SQLite test provider lacks DateTimeOffset ORDER BY; SQL Server uses SQL paging.
        if ((dbContext.Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) == true) &&
            options.SortBy.Equals("eatenAt", StringComparison.OrdinalIgnoreCase))
        {
            var sqliteRows = await source.Include(x => x.Items).ToListAsync(cancellationToken);
            var ordered = (options.Descending
                ? sqliteRows.OrderByDescending(x => x.EatenAt)
                : sqliteRows.OrderBy(x => x.EatenAt)).ThenBy(x => x.Id);
            return new PagedRepositoryItems<MealLog>(ordered
                .Skip((options.Page - 1) * options.PageSize).Take(options.PageSize).ToList(), total);
        }

        var sorted = (options.SortBy.ToLowerInvariant(), options.Descending) switch
        {
            ("title", false) => source.OrderBy(x => x.Title).ThenBy(x => x.Id),
            ("title", true) => source.OrderByDescending(x => x.Title).ThenBy(x => x.Id),
            ("calories", false) => source.OrderBy(x => x.TotalCaloriesKcal).ThenBy(x => x.Id),
            ("calories", true) => source.OrderByDescending(x => x.TotalCaloriesKcal).ThenBy(x => x.Id),
            ("localdate", false) => source.OrderBy(x => x.LocalDate).ThenBy(x => x.Id),
            ("localdate", true) => source.OrderByDescending(x => x.LocalDate).ThenBy(x => x.Id),
            ("eatenat", false) => source.OrderBy(x => x.EatenAt).ThenBy(x => x.Id),
            _ => source.OrderByDescending(x => x.EatenAt).ThenBy(x => x.Id),
        };
        var items = await sorted.Include(x => x.Items)
            .Skip((options.Page - 1) * options.PageSize).Take(options.PageSize)
            .ToListAsync(cancellationToken);
        return new PagedRepositoryItems<MealLog>(items, total);
    }

    public async Task<IReadOnlyList<MealLog>> ListByDateRangeAsync(
        Guid userId,
        DateOnly fromDate,
        DateOnly toDate,
        CancellationToken cancellationToken = default)
    {
        var logs = await dbContext.MealLogs
            .AsNoTracking()
            .Include(x => x.Items)
            .Where(x =>
                x.UserId == userId &&
                !x.IsDeleted &&
                x.LocalDate >= fromDate &&
                x.LocalDate <= toDate)
            .ToListAsync(cancellationToken);

        return logs
            .OrderBy(x => x.LocalDate)
            .ThenBy(x => x.EatenAt)
            .ThenBy(x => x.Id)
            .ToList();
    }

    public async Task<IReadOnlyList<MealLog>> ListActiveByLocalDateAsync(
        Guid userId,
        DateOnly localDate,
        CancellationToken cancellationToken = default)
    {
        var logs = await dbContext.MealLogs
            .AsNoTracking()
            .Include(x => x.Items)
            .Where(x =>
                x.UserId == userId &&
                !x.IsDeleted &&
                x.LocalDate == localDate)
            .ToListAsync(cancellationToken);

        return logs
            .OrderBy(x => x.EatenAt)
            .ThenBy(x => x.Id)
            .ToList();
    }

    public async Task AddAsync(MealLog mealLog, CancellationToken cancellationToken = default)
    {
        await dbContext.MealLogs.AddAsync(mealLog, cancellationToken);
    }

    public void ReplaceItems(MealLog mealLog, IReadOnlyList<MealLogItem> newItems)
    {
        dbContext.MealLogItems.RemoveRange(mealLog.Items);
        mealLog.Items.Clear();

        foreach (var item in newItems)
        {
            mealLog.Items.Add(item);
        }

        dbContext.MealLogItems.AddRange(newItems);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
