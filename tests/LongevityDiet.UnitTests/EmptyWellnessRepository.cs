using LongevityDiet.Domain.Entities;
using LongevityDiet.Repositories.Repositories;

namespace LongevityDiet.UnitTests;

/// <summary>In-memory reviewed screening used by deterministic planner tests.</summary>
internal sealed class EmptyWellnessRepository(string confirmedAllergiesCsv = "") : IWellnessRepository
{
    public Task<UserProfile?> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default) =>
        Task.FromResult<UserProfile?>(null);
    public Task<WellnessScreening?> GetScreeningAsync(Guid userId, CancellationToken cancellationToken = default) =>
        Task.FromResult<WellnessScreening?>(new WellnessScreening
        {
            UserId = userId,
            AllergiesReviewed = true,
            ReviewedAllergiesCsv = confirmedAllergiesCsv,
            RiskFlagsCsv = string.Empty,
            ReviewedAt = DateTimeOffset.UtcNow
        });
    public Task UpsertScreeningAsync(WellnessScreening screening, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;
    public Task<WellnessCheckIn?> GetCheckInAsync(Guid userId, DateOnly localDate, string phase, CancellationToken cancellationToken = default) =>
        Task.FromResult<WellnessCheckIn?>(null);
    public Task<IReadOnlyList<WellnessCheckIn>> GetCheckInsAsync(Guid userId, DateOnly fromDate, DateOnly toDate, CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<WellnessCheckIn>>([]);
    public Task AddCheckInAsync(WellnessCheckIn checkIn, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;
    public Task<WellnessCheckIn?> GetCheckInByIdAsync(Guid userId, Guid checkInId, CancellationToken cancellationToken = default) =>
        Task.FromResult<WellnessCheckIn?>(null);
    public void RemoveCheckIn(WellnessCheckIn checkIn) { }
    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
}
