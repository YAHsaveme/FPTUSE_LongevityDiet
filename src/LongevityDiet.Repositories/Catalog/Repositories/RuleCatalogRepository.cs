using LongevityDiet.Repositories.Catalog.Queries;
using LongevityDiet.Domain.Catalog;
using LongevityDiet.Domain.Catalog.Entities;
using Microsoft.EntityFrameworkCore;

namespace LongevityDiet.Repositories.Catalog.Repositories;

public sealed class RuleCatalogRepository(LongevityDietDbContext dbContext) : IRuleCatalogRepository
{
    public async Task<IReadOnlyList<DietRule>> GetActiveRulesAsync(
        CancellationToken cancellationToken = default) =>
        await dbContext.DietRules
            .AsNoTracking()
            .Where(x => x.IsActive)
            .Include(x => x.Versions.Where(v => v.State == RuleVersionState.Published))
            .OrderBy(x => x.RuleKey)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<DietRule>> GetAllRulesAsync(
        CancellationToken cancellationToken = default) =>
        await dbContext.DietRules
            .AsNoTracking()
            .Include(x => x.Versions)
            .OrderBy(x => x.RuleKey)
            .ToListAsync(cancellationToken);

    public Task<DietRule?> FindRuleAsync(
        Guid id,
        bool includeInactive,
        bool trackChanges = false,
        CancellationToken cancellationToken = default)
    {
        IQueryable<DietRule> source = dbContext.DietRules
            .Include(x => x.Versions);

        if (!trackChanges)
        {
            source = source.AsNoTracking();
        }

        if (!includeInactive)
        {
            source = source.Where(x => x.IsActive);
        }

        return source.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<RuleVersion?> FindVersionAsync(
        Guid id,
        CancellationToken cancellationToken = default) =>
        dbContext.RuleVersions
            .Include(x => x.DietRule)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<RuleSetVersion?> GetActiveRuleSetAsync(
        CancellationToken cancellationToken = default) =>
        dbContext.RuleSetVersions
            .AsNoTracking()
            .Include(x => x.RuleVersions)
            .ThenInclude(x => x.DietRule)
            .Where(x => x.IsActive)
            .OrderByDescending(x => x.EffectiveAt)
            .ThenBy(x => x.Id)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<RuleVersion>> FindVersionsAsync(
        IReadOnlyCollection<Guid> ids,
        CancellationToken cancellationToken = default) =>
        await dbContext.RuleVersions
            .Where(x => ids.Contains(x.Id))
            .ToListAsync(cancellationToken);

    public async Task AddRuleAsync(DietRule rule, CancellationToken cancellationToken = default) =>
        await dbContext.DietRules.AddAsync(rule, cancellationToken);

    public async Task AddVersionAsync(RuleVersion version, CancellationToken cancellationToken = default) =>
        await dbContext.RuleVersions.AddAsync(version, cancellationToken);

    public async Task AddRuleSetAsync(RuleSetVersion ruleSet, CancellationToken cancellationToken = default) =>
        await dbContext.RuleSetVersions.AddAsync(ruleSet, cancellationToken);

    public async Task AddAuditAsync(RuleAudit audit, CancellationToken cancellationToken = default) =>
        await dbContext.RuleAudits.AddAsync(audit, cancellationToken);

    public async Task<RepositoryPage<RuleAudit>> GetHistoryAsync(Guid versionId, int page, int pageSize, string? search, string? action, CancellationToken cancellationToken = default)
    {
        var query = dbContext.RuleAudits.AsNoTracking().Where(x => x.RuleVersionId == versionId);
        if (!string.IsNullOrWhiteSpace(action))
        {
            query = query.Where(x => x.Action == action);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(x => x.Action.Contains(search) || x.Details.Contains(search));
        }

        var total = await query.CountAsync(cancellationToken);
        if (dbContext.Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) == true)
        {
            // SQLite cannot translate ORDER BY DateTimeOffset. The current runtime uses SQL Server;
            // this provider-specific branch keeps SQLite integration tests chronologically correct.
            var sqliteItems = await query.ToListAsync(cancellationToken);
            var pageItems = sqliteItems.OrderByDescending(x => x.OccurredAt).ThenBy(x => x.Id)
                .Skip((page - 1) * pageSize).Take(pageSize).ToList();
            return new RepositoryPage<RuleAudit>(pageItems, total);
        }

        var items = await query.OrderByDescending(x => x.OccurredAt).ThenBy(x => x.Id)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);
        return new RepositoryPage<RuleAudit>(items, total);
    }

    public async Task<RepositoryPage<RuleVersion>> GetReviewQueueAsync(
        int page, int pageSize, bool? medicalSensitive, CancellationToken cancellationToken = default)
    {
        var query = dbContext.RuleVersions.AsNoTracking()
            .Include(x => x.DietRule)
            .Where(x => x.State == RuleVersionState.InReview);
        if (medicalSensitive is { } sensitive)
            query = query.Where(x => x.DietRule.IsMedicalSensitive == sensitive);
        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderBy(x => x.DietRule.RuleKey)
            .ThenBy(x => x.VersionNumber).ThenBy(x => x.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync(cancellationToken);
        return new RepositoryPage<RuleVersion>(items, total);
    }

    public async Task<IReadOnlyList<RuleSetPlanUsage>> GetRuleSetUsageAsync(
        Guid ruleVersionId, CancellationToken cancellationToken = default)
    {
        var sets = await dbContext.RuleSetVersions.AsNoTracking()
            .Where(x => x.RuleVersions.Any(v => v.Id == ruleVersionId))
            .Select(x => new { x.VersionLabel, x.IsActive })
            .ToListAsync(cancellationToken);
        if (sets.Count == 0) return [];

        var labels = sets.Select(x => x.VersionLabel).ToArray();
        var stats = await dbContext.MealPlans.AsNoTracking()
            .Where(x => labels.Contains(x.RuleSetVersion))
            .GroupBy(x => x.RuleSetVersion)
            .Select(g => new
            {
                VersionLabel = g.Key,
                Total = g.Count(),
                Active = g.Count(x => x.Status == LongevityDiet.Domain.Entities.MealPlanStatus.Active),
                Users = g.Select(x => x.UserId).Distinct().Count()
            })
            .ToListAsync(cancellationToken);
        return sets.Select(x =>
        {
            var count = stats.FirstOrDefault(s => s.VersionLabel == x.VersionLabel);
            return new RuleSetPlanUsage(
                x.VersionLabel, x.IsActive, count?.Total ?? 0,
                count?.Active ?? 0, count?.Users ?? 0);
        }).ToArray();
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
