using LongevityDiet.Domain.Entities;

namespace LongevityDiet.Repositories.Repositories;

public interface IWellnessRepository
{
    Task<UserProfile?> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<WellnessScreening?> GetScreeningAsync(Guid userId, CancellationToken cancellationToken = default);
    Task UpsertScreeningAsync(WellnessScreening screening, CancellationToken cancellationToken = default);
    Task<WellnessCheckIn?> GetCheckInAsync(Guid userId, DateOnly localDate, string phase, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<WellnessCheckIn>> GetCheckInsAsync(Guid userId, DateOnly fromDate, DateOnly toDate, CancellationToken cancellationToken = default);
    Task AddCheckInAsync(WellnessCheckIn checkIn, CancellationToken cancellationToken = default);
    Task<WellnessCheckIn?> GetCheckInByIdAsync(Guid userId, Guid checkInId, CancellationToken cancellationToken = default);
    void RemoveCheckIn(WellnessCheckIn checkIn);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
