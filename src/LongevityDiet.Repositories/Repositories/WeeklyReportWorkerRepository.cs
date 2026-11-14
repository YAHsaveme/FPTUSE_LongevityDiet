using LongevityDiet.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LongevityDiet.Repositories.Repositories;

public sealed class WeeklyReportWorkerRepository(LongevityDietDbContext db) : IWeeklyReportWorkerRepository
{
    public Task<WeeklyReport?> GetReportAsync(Guid reportId, Guid userId, CancellationToken cancellationToken = default) =>
        db.WeeklyReports.AsNoTracking().Include(x => x.Metrics).FirstOrDefaultAsync(x => x.Id == reportId && x.UserId == userId, cancellationToken);
    public Task<WeeklyReport?> GetReportByWeekAsync(Guid userId, DateOnly weekStart, int version, CancellationToken cancellationToken = default) =>
        db.WeeklyReports.AsNoTracking().Include(x => x.Metrics).FirstOrDefaultAsync(x => x.UserId == userId && x.WeekStart == weekStart && x.ReportVersion == version, cancellationToken);
    public async Task<IReadOnlyList<WeeklyReport>> ListReportsAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await db.WeeklyReports.AsNoTracking().Include(x => x.Metrics).Where(x => x.UserId == userId).OrderByDescending(x => x.WeekStart).ToListAsync(cancellationToken);
    public async Task<PagedRepositoryItems<WeeklyReport>> QueryReportsAsync(
        Guid userId, HistoryPageQuery options, CancellationToken cancellationToken = default)
    {
        var query = db.WeeklyReports.AsNoTracking().Where(x => x.UserId == userId);
        if (!string.IsNullOrWhiteSpace(options.Search))
            query = query.Where(x => x.Summary.Contains(options.Search));
        if (options.FromDate.HasValue)
            query = query.Where(x => x.WeekStart >= options.FromDate.Value);
        if (options.ToDate.HasValue)
            query = query.Where(x => x.WeekStart <= options.ToDate.Value);
        if (!string.IsNullOrWhiteSpace(options.Status) &&
            Enum.TryParse<WeeklyReportStatus>(options.Status, true, out var status))
            query = query.Where(x => x.Status == status);

        var total = await query.CountAsync(cancellationToken);
        if ((db.Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) == true) &&
            options.SortBy.Equals("generatedAt", StringComparison.OrdinalIgnoreCase))
        {
            var sqliteRows = await query.Include(x => x.Metrics).ToListAsync(cancellationToken);
            var ordered = (options.Descending
                ? sqliteRows.OrderByDescending(x => x.GeneratedAt)
                : sqliteRows.OrderBy(x => x.GeneratedAt)).ThenBy(x => x.Id);
            return new PagedRepositoryItems<WeeklyReport>(ordered
                .Skip((options.Page - 1) * options.PageSize).Take(options.PageSize).ToList(), total);
        }

        var sorted = (options.SortBy.ToLowerInvariant(), options.Descending) switch
        {
            ("generatedat", false) => query.OrderBy(x => x.GeneratedAt).ThenBy(x => x.Id),
            ("generatedat", true) => query.OrderByDescending(x => x.GeneratedAt).ThenBy(x => x.Id),
            ("reportversion", false) => query.OrderBy(x => x.ReportVersion).ThenBy(x => x.Id),
            ("reportversion", true) => query.OrderByDescending(x => x.ReportVersion).ThenBy(x => x.Id),
            ("weekstart", false) => query.OrderBy(x => x.WeekStart).ThenBy(x => x.Id),
            _ => query.OrderByDescending(x => x.WeekStart).ThenBy(x => x.Id),
        };
        var items = await sorted.Include(x => x.Metrics)
            .Skip((options.Page - 1) * options.PageSize).Take(options.PageSize)
            .ToListAsync(cancellationToken);
        return new PagedRepositoryItems<WeeklyReport>(items, total);
    }

    public Task AddReportAsync(WeeklyReport report, CancellationToken cancellationToken = default) => db.WeeklyReports.AddAsync(report, cancellationToken).AsTask();
    public Task<WorkerJob?> GetJobByKeyAsync(string key, CancellationToken cancellationToken = default) =>
        db.WorkerJobs.FirstOrDefaultAsync(x => x.IdempotencyKey == key, cancellationToken);
    public Task AddJobAsync(WorkerJob job, CancellationToken cancellationToken = default) => db.WorkerJobs.AddAsync(job, cancellationToken).AsTask();
    public async Task<IReadOnlyList<WorkerJob>> ListRunnableJobsAsync(DateTimeOffset now, int limit, CancellationToken cancellationToken = default)
    {
        var pending = await db.WorkerJobs.Where(x => x.Status == WorkerJobStatus.Pending).ToListAsync(cancellationToken);
        return pending.Where(x => x.NextAttemptAt <= now)
            .OrderBy(x => x.NextAttemptAt).ThenBy(x => x.Id).Take(limit).ToList();
    }

    public async Task<IReadOnlyList<WorkerJob>> ListJobsAsync(int limit, CancellationToken cancellationToken = default)
    {
        var jobs = await db.WorkerJobs.AsNoTracking().ToListAsync(cancellationToken);
        return jobs.OrderByDescending(x => x.UpdatedAt).Take(limit).ToList();
    }
    public Task AddDeadLetterAsync(WorkerDeadLetter deadLetter, CancellationToken cancellationToken = default) =>
        db.WorkerDeadLetters.AddAsync(deadLetter, cancellationToken).AsTask();
    public async Task<IReadOnlyList<WorkerDeadLetter>> ListDeadLettersAsync(int limit, CancellationToken cancellationToken = default)
    {
        var items = await db.WorkerDeadLetters.AsNoTracking().ToListAsync(cancellationToken);
        return items.OrderByDescending(x => x.DeadLetteredAt).Take(limit).ToList();
    }
    public Task<WorkerDeadLetter?> GetDeadLetterAsync(Guid id, CancellationToken cancellationToken = default) =>
        db.WorkerDeadLetters.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    public Task<bool> HasProcessedEventAsync(Guid eventId, CancellationToken cancellationToken = default) =>
        db.WorkerProcessedEvents.AsNoTracking().AnyAsync(x => x.EventId == eventId, cancellationToken);
    public Task AddProcessedEventAsync(WorkerProcessedEvent processed, CancellationToken cancellationToken = default) =>
        db.WorkerProcessedEvents.AddAsync(processed, cancellationToken).AsTask();
    public async Task UpsertHeartbeatAsync(WorkerHeartbeat heartbeat, CancellationToken cancellationToken = default)
    {
        var existing = await db.WorkerHeartbeats.FirstOrDefaultAsync(x => x.WorkerName == heartbeat.WorkerName, cancellationToken);
        if (existing is null) await db.WorkerHeartbeats.AddAsync(heartbeat, cancellationToken);
        else { existing.LastSeenAt = heartbeat.LastSeenAt; existing.InstanceId = heartbeat.InstanceId; }
    }
    public Task<WorkerHeartbeat?> GetHeartbeatAsync(string workerName, CancellationToken cancellationToken = default) =>
        db.WorkerHeartbeats.AsNoTracking().FirstOrDefaultAsync(x => x.WorkerName == workerName, cancellationToken);
    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => db.SaveChangesAsync(cancellationToken);
}
