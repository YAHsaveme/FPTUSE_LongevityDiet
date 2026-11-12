using LongevityDiet.Domain.Entities;
using LongevityDiet.Repositories.Repositories;
using Microsoft.EntityFrameworkCore;

namespace LongevityDiet.Identity;

// Reuses existing auth logic with a strictly isolated IdentityDbContext.
public sealed class IdentityUserRepository(IdentityDbContext db) : IUserRepository
{
    public Task<bool> EmailExistsAsync(string normalizedEmail, CancellationToken cancellationToken = default) =>
        db.Users.AnyAsync(x => x.NormalizedEmail == normalizedEmail, cancellationToken);
    public Task<User?> FindByEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default) =>
        db.Users.Include(x => x.Profile).FirstOrDefaultAsync(x => x.NormalizedEmail == normalizedEmail, cancellationToken);
    public Task<User?> FindByIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
        db.Users.Include(x => x.Profile).FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);
    public async Task AddAsync(User user, CancellationToken cancellationToken = default) =>
        await db.Users.AddAsync(user, cancellationToken);
    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        db.SaveChangesAsync(cancellationToken);
}

public sealed class IdentityRefreshTokenRepository(IdentityDbContext db) : IRefreshTokenRepository
{
    public Task<RefreshToken?> FindByHashAsync(string tokenHash, CancellationToken cancellationToken = default) =>
        db.RefreshTokens.Include(x => x.User).ThenInclude(x => x.Profile)
            .FirstOrDefaultAsync(x => x.TokenHash == tokenHash, cancellationToken);
    public async Task AddAsync(RefreshToken token, CancellationToken cancellationToken = default) =>
        await db.RefreshTokens.AddAsync(token, cancellationToken);
    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        db.SaveChangesAsync(cancellationToken);
}
