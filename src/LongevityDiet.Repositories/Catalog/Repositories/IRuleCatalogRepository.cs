using LongevityDiet.Repositories.Catalog.Queries;
using LongevityDiet.Domain.Catalog.Entities;

namespace LongevityDiet.Repositories.Catalog.Repositories;

public sealed record RuleSetPlanUsage(
    string RuleSetVersion, bool IsActiveRuleSet, int TotalPlans,
    int ActivePlans, int DistinctUsers);

public interface IRuleCatalogRepository
{
    Task<RepositoryPage<RuleVersion>> GetReviewQueueAsync(
        int page, int pageSize, bool? medicalSensitive, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RuleSetPlanUsage>> GetRuleSetUsageAsync(
        Guid ruleVersionId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DietRule>> GetActiveRulesAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DietRule>> GetAllRulesAsync(CancellationToken cancellationToken = default);
    Task<DietRule?> FindRuleAsync(Guid id, bool includeInactive, bool trackChanges = false, CancellationToken cancellationToken = default);
    Task<RuleVersion?> FindVersionAsync(Guid id, CancellationToken cancellationToken = default);
    Task<RuleSetVersion?> GetActiveRuleSetAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RuleVersion>> FindVersionsAsync(IReadOnlyCollection<Guid> ids, CancellationToken cancellationToken = default);
    Task AddRuleAsync(DietRule rule, CancellationToken cancellationToken = default);
    Task AddVersionAsync(RuleVersion version, CancellationToken cancellationToken = default);
    Task AddRuleSetAsync(RuleSetVersion ruleSet, CancellationToken cancellationToken = default);
    Task AddAuditAsync(RuleAudit audit, CancellationToken cancellationToken = default);
    Task<RepositoryPage<RuleAudit>> GetHistoryAsync(Guid versionId, int page, int pageSize, string? search, string? action, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
