using LongevityDiet.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LongevityDiet.Repositories.Repositories;

public sealed class WellnessRepository(LongevityDietDbContext db) : IWellnessRepository
{
    public Task<UserProfile?> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default) =>
        db.UserProfiles.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);

    public Task<WellnessScreening?> GetScreeningAsync(Guid userId, CancellationToken cancellationToken = default) =>
        db.WellnessScreenings.FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);

    public async Task UpsertScreeningAsync(WellnessScreening screening, CancellationToken cancellationToken = default)
    {
        var existing = await GetScreeningAsync(screening.UserId, cancellationToken);
        if (existing is null)
        {
            await db.WellnessScreenings.AddAsync(screening, cancellationToken);
        }
        else
        {
            existing.RiskFlagsCsv = screening.RiskFlagsCsv;
            existing.AllergiesReviewed = screening.AllergiesReviewed;
            existing.ReviewedAllergiesCsv = screening.ReviewedAllergiesCsv;
            existing.ReviewedAt = screening.ReviewedAt;
        }
    }

    public Task<WellnessCheckIn?> GetCheckInAsync(Guid userId, DateOnly localDate, string phase, CancellationToken cancellationToken = default) =>
        db.WellnessCheckIns.FirstOrDefaultAsync(x => x.UserId == userId && x.LocalDate == localDate && x.Phase == phase, cancellationToken);

    public async Task<IReadOnlyList<WellnessCheckIn>> GetCheckInsAsync(
        Guid userId, DateOnly fromDate, DateOnly toDate, CancellationToken cancellationToken = default) =>
        (await db.WellnessCheckIns.AsNoTracking()
            .Where(x => x.UserId == userId && x.LocalDate >= fromDate && x.LocalDate <= toDate)
            .OrderByDescending(x => x.LocalDate)
            .Take(1200).ToListAsync(cancellationToken))
            .OrderByDescending(x => x.LocalDate)
            .ThenByDescending(x => x.RecordedAt)
            .ToList();

    public Task AddCheckInAsync(WellnessCheckIn checkIn, CancellationToken cancellationToken = default) =>
        db.WellnessCheckIns.AddAsync(checkIn, cancellationToken).AsTask();

    public Task<WellnessCheckIn?> GetCheckInByIdAsync(Guid userId, Guid checkInId, CancellationToken cancellationToken = default) =>
        db.WellnessCheckIns.FirstOrDefaultAsync(x => x.UserId == userId && x.Id == checkInId, cancellationToken);

    public void RemoveCheckIn(WellnessCheckIn checkIn) => db.WellnessCheckIns.Remove(checkIn);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        db.SaveChangesAsync(cancellationToken);
}
