using LongevityDiet.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LongevityDiet.Repositories.Repositories;

// The directory deliberately excludes health data, allergies, meal plans and password hashes.
public sealed record AdminMemberSummary(
    Guid Id, string DisplayName, string Email, string Status,
    bool EmailVerified, bool ProfileCompleted,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record AdminMemberPage(
    IReadOnlyList<AdminMemberSummary> Items, int Page, int PageSize,
    int TotalItems, int TotalPages);
public sealed record AdminMemberAuditEntry(
    Guid Id, Guid ActorAdminId, string PreviousStatus, string NewStatus,
    string Reason, DateTimeOffset ChangedAt);

public interface IAdminMemberRepository
{
    Task<AdminMemberPage> QueryAsync(string? search, AccountStatus? status, bool? verified,
        string sortBy, bool descending, int page, int pageSize, CancellationToken cancellationToken);
    Task<AdminMemberSummary?> GetAsync(Guid memberId, CancellationToken cancellationToken);
    Task<IReadOnlyList<AdminMemberAuditEntry>> HistoryAsync(Guid memberId, CancellationToken cancellationToken);
    Task<AdminMemberSummary?> ChangeStatusAsync(Guid memberId, Guid actorAdminId,
        AccountStatus desiredStatus, string reason, DateTimeOffset timestamp, CancellationToken cancellationToken);
}

public sealed class AdminMemberRepository(LongevityDietDbContext database) : IAdminMemberRepository
{
    private IQueryable<User> Members => database.Users.Where(user => user.Role == UserRole.Member);

    private static AdminMemberSummary ToSummary(User member) => new(
        member.Id, member.DisplayName, member.Email, member.Status.ToString(),
        member.EmailVerifiedAtUtc is not null, member.Profile?.ProfileCompleted ?? false,
        member.CreatedAt, member.UpdatedAt);

    public async Task<AdminMemberPage> QueryAsync(
        string? search, AccountStatus? status, bool? verified, string sortBy,
        bool descending, int page, int pageSize, CancellationToken cancellationToken)
    {
        var query = Members.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            var normalized = term.ToUpperInvariant();
            query = query.Where(u => u.NormalizedEmail.Contains(normalized) ||
                u.DisplayName.Contains(term));
        }
        if (status is not null)
            query = query.Where(u => u.Status == status.Value);
        if (verified is not null)
            query = verified.Value ? query.Where(u => u.EmailVerifiedAtUtc != null)
                : query.Where(u => u.EmailVerifiedAtUtc == null);

        var total = await query.CountAsync(cancellationToken);
        // SQLite does not support server-side DateTimeOffset ORDER BY. Keep SQL
        // pagination for production; perform equivalent ordering only in integration SQLite.
        if (database.Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) == true)
        {
            var all = await query.Include(u => u.Profile).ToListAsync(cancellationToken);
            IOrderedEnumerable<User> inMemory = sortBy switch
            {
                "email" => descending ? all.OrderByDescending(u => u.NormalizedEmail) : all.OrderBy(u => u.NormalizedEmail),
                "name" => descending ? all.OrderByDescending(u => u.DisplayName) : all.OrderBy(u => u.DisplayName),
                "status" => descending ? all.OrderByDescending(u => u.Status) : all.OrderBy(u => u.Status),
                _ => descending ? all.OrderByDescending(u => u.CreatedAt) : all.OrderBy(u => u.CreatedAt),
            };
            var entries = inMemory.ThenBy(u => u.Id).Skip((page - 1) * pageSize)
                .Take(pageSize).Select(ToSummary).ToList();
            return new AdminMemberPage(entries, page, pageSize, total,
                Math.Max(1, (int)Math.Ceiling((double)total / pageSize)));
        }
        IOrderedQueryable<User> sorted = sortBy switch
        {
            "email" => descending ? query.OrderByDescending(u => u.NormalizedEmail)
                : query.OrderBy(u => u.NormalizedEmail),
            "name" => descending ? query.OrderByDescending(u => u.DisplayName)
                : query.OrderBy(u => u.DisplayName),
            "status" => descending ? query.OrderByDescending(u => u.Status)
                : query.OrderBy(u => u.Status),
            _ => descending ? query.OrderByDescending(u => u.CreatedAt)
                : query.OrderBy(u => u.CreatedAt),
        };

        var members = await sorted.ThenBy(u => u.Id).Skip((page - 1) * pageSize)
            .Take(pageSize).Include(u => u.Profile).ToListAsync(cancellationToken);
        return new AdminMemberPage(members.Select(ToSummary).ToList(), page, pageSize,
            total, Math.Max(1, (int)Math.Ceiling((double)total / pageSize)));
    }

    public async Task<AdminMemberSummary?> GetAsync(Guid memberId, CancellationToken cancellationToken)
    {
        var member = await Members.AsNoTracking().Include(u => u.Profile)
            .SingleOrDefaultAsync(u => u.Id == memberId, cancellationToken);
        return member is null ? null : ToSummary(member);
    }

    public async Task<IReadOnlyList<AdminMemberAuditEntry>> HistoryAsync(
        Guid memberId, CancellationToken cancellationToken)
    {
        var history = database.MemberAccountAudits.AsNoTracking()
            .Where(a => a.MemberId == memberId);
        var records = database.Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) == true
            ? (await history.ToListAsync(cancellationToken)).OrderByDescending(a => a.ChangedAt)
                .ThenByDescending(a => a.Id).Take(50).ToList()
            : await history.OrderByDescending(a => a.ChangedAt).ThenByDescending(a => a.Id)
                .Take(50).ToListAsync(cancellationToken);
        return records.Select(a => new AdminMemberAuditEntry(
            a.Id, a.ActorAdminId, a.PreviousStatus.ToString(), a.NewStatus.ToString(),
            a.Reason, a.ChangedAt)).ToList();
    }

    public async Task<AdminMemberSummary?> ChangeStatusAsync(
        Guid memberId, Guid actorAdminId, AccountStatus desiredStatus,
        string reason, DateTimeOffset timestamp, CancellationToken cancellationToken)
    {
        // A privileged account cannot appear in this Member-only query.
        var member = await Members.Include(u => u.Profile)
            .SingleOrDefaultAsync(u => u.Id == memberId, cancellationToken);
        if (member is null) return null;
        if (member.Status == desiredStatus) return ToSummary(member);

        var previous = member.Status;
        member.Status = desiredStatus;
        member.UpdatedAt = timestamp;
        if (desiredStatus == AccountStatus.Disabled) member.SessionVersion++;
        if (desiredStatus == AccountStatus.Disabled)
        {
            // The JWT validator below also rejects already-issued access tokens.
            var sessions = await database.RefreshTokens
                .Where(t => t.UserId == memberId && t.RevokedAt == null)
                .ToListAsync(cancellationToken);
            foreach (var session in sessions) session.RevokedAt = timestamp;
        }

        await database.MemberAccountAudits.AddAsync(new MemberAccountAudit
        {
            MemberId = memberId, ActorAdminId = actorAdminId,
            PreviousStatus = previous, NewStatus = desiredStatus,
            Reason = reason, ChangedAt = timestamp
        }, cancellationToken);
        await database.SaveChangesAsync(cancellationToken);
        return ToSummary(member);
    }
}
