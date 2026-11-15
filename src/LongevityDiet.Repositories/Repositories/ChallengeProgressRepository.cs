using LongevityDiet.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LongevityDiet.Repositories.Repositories;

public sealed class ChallengeProgressRepository(LongevityDietDbContext dbContext) : IChallengeProgressRepository
{
    public async Task<IReadOnlyList<ChallengeTemplate>> ListActiveTemplatesAsync(CancellationToken cancellationToken = default) =>
        await dbContext.ChallengeTemplates.AsNoTracking().Include(x => x.Days).Where(x => x.IsActive)
            .OrderBy(x => x.Code).ToListAsync(cancellationToken);

    public Task<ChallengeTemplate?> GetTemplateAsync(Guid templateId, CancellationToken cancellationToken = default) =>
        dbContext.ChallengeTemplates.Include(x => x.Days)
            .FirstOrDefaultAsync(x => x.Id == templateId && x.IsActive, cancellationToken);

    public Task<UserChallenge?> GetActiveChallengeAsync(Guid userId, CancellationToken cancellationToken = default) =>
        dbContext.UserChallenges.Include(x => x.ChallengeTemplate).ThenInclude(x => x.Days).Include(x => x.Days)
            .FirstOrDefaultAsync(x => x.UserId == userId && x.Status == UserChallengeStatus.Active, cancellationToken);

    public Task<UserChallenge?> GetChallengeAsync(Guid challengeId, Guid userId, CancellationToken cancellationToken = default) =>
        dbContext.UserChallenges.Include(x => x.ChallengeTemplate).ThenInclude(x => x.Days).Include(x => x.Days)
            .FirstOrDefaultAsync(x => x.Id == challengeId && x.UserId == userId, cancellationToken);

    public async Task<IReadOnlyList<UserChallenge>> ListHistoryAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await dbContext.UserChallenges.AsNoTracking()
            .Include(x => x.ChallengeTemplate).ThenInclude(x => x.Days)
            .Include(x => x.Days)
            .Where(x => x.UserId == userId).OrderByDescending(x => x.StartDate).ThenByDescending(x => x.Id)
            .ToListAsync(cancellationToken);

    public async Task<PagedRepositoryItems<UserChallenge>> QueryHistoryAsync(
        Guid userId, HistoryPageQuery options, CancellationToken cancellationToken = default)
    {
        var source = dbContext.UserChallenges.AsNoTracking().Where(x => x.UserId == userId);
        if (options.FromDate.HasValue)
            source = source.Where(x => x.StartDate >= options.FromDate.Value);
        if (options.ToDate.HasValue)
            source = source.Where(x => x.StartDate <= options.ToDate.Value);
        if (!string.IsNullOrWhiteSpace(options.Search))
            source = source.Where(x => x.ChallengeTemplate.Title.Contains(options.Search));
        if (!string.IsNullOrWhiteSpace(options.Status) &&
            Enum.TryParse<UserChallengeStatus>(options.Status, true, out var status))
            source = source.Where(x => x.Status == status);
        var total = await source.CountAsync(cancellationToken);
        if ((dbContext.Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) == true) &&
            options.SortBy.Equals("updatedAt", StringComparison.OrdinalIgnoreCase))
        {
            var sqliteRows = await source
                .Include(x => x.ChallengeTemplate).ThenInclude(x => x.Days)
                .Include(x => x.Days).ToListAsync(cancellationToken);
            var ordered = (options.Descending
                ? sqliteRows.OrderByDescending(x => x.UpdatedAt)
                : sqliteRows.OrderBy(x => x.UpdatedAt)).ThenBy(x => x.Id);
            return new PagedRepositoryItems<UserChallenge>(ordered
                .Skip((options.Page - 1) * options.PageSize).Take(options.PageSize).ToList(), total);
        }

        var sorted = (options.SortBy.ToLowerInvariant(), options.Descending) switch
        {
            ("enddate", false) => source.OrderBy(x => x.EndDate).ThenBy(x => x.Id),
            ("enddate", true) => source.OrderByDescending(x => x.EndDate).ThenBy(x => x.Id),
            ("updatedat", false) => source.OrderBy(x => x.UpdatedAt).ThenBy(x => x.Id),
            ("updatedat", true) => source.OrderByDescending(x => x.UpdatedAt).ThenBy(x => x.Id),
            ("startdate", false) => source.OrderBy(x => x.StartDate).ThenBy(x => x.Id),
            _ => source.OrderByDescending(x => x.StartDate).ThenBy(x => x.Id),
        };
        var items = await sorted
            .Include(x => x.ChallengeTemplate).ThenInclude(x => x.Days)
            .Include(x => x.Days)
            .AsSplitQuery()
            .Skip((options.Page - 1) * options.PageSize).Take(options.PageSize)
            .ToListAsync(cancellationToken);
        return new PagedRepositoryItems<UserChallenge>(items, total);
    }

    public Task AddChallengeAsync(UserChallenge challenge, CancellationToken cancellationToken = default) =>
        dbContext.UserChallenges.AddAsync(challenge, cancellationToken).AsTask();

    public Task<DailyWellnessSummary?> GetDailySummaryAsync(Guid userId, DateOnly localDate, CancellationToken cancellationToken = default) =>
        dbContext.DailyWellnessSummaries.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId && x.LocalDate == localDate, cancellationToken);

    public async Task<IReadOnlyList<DailyWellnessSummary>> ListDailySummariesAsync(Guid userId, DateOnly fromDate, DateOnly toDate, CancellationToken cancellationToken = default) =>
        await dbContext.DailyWellnessSummaries.AsNoTracking()
            .Where(x => x.UserId == userId && x.LocalDate >= fromDate && x.LocalDate <= toDate)
            .OrderBy(x => x.LocalDate).ToListAsync(cancellationToken);

    public async Task UpsertDailySummaryAsync(DailyWellnessSummary summary, CancellationToken cancellationToken = default)
    {
        var existing = await dbContext.DailyWellnessSummaries
            .FirstOrDefaultAsync(x => x.UserId == summary.UserId && x.LocalDate == summary.LocalDate, cancellationToken);
        if (existing is null)
        {
            await dbContext.DailyWellnessSummaries.AddAsync(summary, cancellationToken);
            return;
        }

        existing.LoggedMealCount = summary.LoggedMealCount;
        existing.TotalCaloriesKcal = summary.TotalCaloriesKcal;
        existing.EatingWindowWithinTarget = summary.EatingWindowWithinTarget;
        existing.ChallengeDayCompleted = summary.ChallengeDayCompleted;
        existing.ChallengeCurrentStreak = summary.ChallengeCurrentStreak;
        existing.LoggingConsistencyScore = summary.LoggingConsistencyScore;
        existing.DataAvailability = summary.DataAvailability;
        existing.UpdatedAt = summary.UpdatedAt;
    }

    public Task<bool> HasProcessedEventAsync(Guid eventId, CancellationToken cancellationToken = default) =>
        dbContext.ProgressEventReceipts.AsNoTracking().AnyAsync(x => x.EventId == eventId, cancellationToken);

    public Task AddProcessedEventAsync(ProgressEventReceipt receipt, CancellationToken cancellationToken = default) =>
        dbContext.ProgressEventReceipts.AddAsync(receipt, cancellationToken).AsTask();

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => dbContext.SaveChangesAsync(cancellationToken);
}
