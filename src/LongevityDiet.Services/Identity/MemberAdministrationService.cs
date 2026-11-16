using LongevityDiet.Domain.Entities;
using LongevityDiet.Repositories.Repositories;

namespace LongevityDiet.Services.Identity;

public sealed class MemberAdministrationService(
    IAdminMemberRepository repository, TimeProvider timeProvider)
{
    public Task<AdminMemberPage> FindAsync(string? search, AccountStatus? status, bool? verified,
        string sortBy, bool descending, int page, int pageSize, CancellationToken ct) =>
        repository.QueryAsync(search, status, verified, sortBy, descending, page, pageSize, ct);

    public Task<AdminMemberSummary?> GetAsync(Guid id, CancellationToken ct) =>
        repository.GetAsync(id, ct);

    public Task<IReadOnlyList<AdminMemberAuditEntry>> HistoryAsync(Guid id, CancellationToken ct) =>
        repository.HistoryAsync(id, ct);

    public Task<AdminMemberSummary?> ChangeStatusAsync(
        Guid id, Guid adminId, AccountStatus status, string reason, CancellationToken ct) =>
        repository.ChangeStatusAsync(id, adminId, status, reason.Trim(),
            timeProvider.GetUtcNow(), ct);
}
