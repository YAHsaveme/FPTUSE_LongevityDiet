using LongevityDiet.Domain.Entities;
using LongevityDiet.Repositories.Repositories;
using LongevityDiet.Services.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace LongevityDiet.UnitTests;

public sealed class AuthenticationServiceTests
{
    private static AuthenticationService CreateService(
        FakeUserRepository users,
        FakeRefreshTokenRepository tokens,
        FakeAccessTokenProvider accessTokens)
    {
        return new AuthenticationService(
            users,
            tokens,
            new PasswordHasher<User>(),
            accessTokens,
            Options.Create(new AuthenticationOptions { RefreshTokenDays = 14 }),
            TimeProvider.System);
    }

    [Fact]
    public async Task Register_CreatesUserSessionAndHashedRefreshToken()
    {
        var users = new FakeUserRepository();
        var tokens = new FakeRefreshTokenRepository();
        var service = CreateService(users, tokens, new FakeAccessTokenProvider());

        var result = await service.RegisterAsync(
            new RegisterUserCommand("member@example.com", "StrongPass123!", "Member"));

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);
        Assert.Single(users.Users);
        Assert.Single(tokens.Tokens);
        Assert.NotEqual(result.Value!.RefreshToken, tokens.Tokens[0].TokenHash);
        Assert.False(result.Value.User.ProfileCompleted);
    }

    [Fact]
    public async Task Register_DuplicateEmailIsRejectedCaseInsensitively()
    {
        var users = new FakeUserRepository();
        var tokens = new FakeRefreshTokenRepository();
        var service = CreateService(users, tokens, new FakeAccessTokenProvider());

        var first = await service.RegisterAsync(
            new RegisterUserCommand("member@example.com", "StrongPass123!", "Member"));
        var second = await service.RegisterAsync(
            new RegisterUserCommand("MEMBER@example.com", "StrongPass123!", "Another"));

        Assert.True(first.Succeeded);
        Assert.False(second.Succeeded);
        Assert.Equal("email_exists", second.ErrorCode);
        Assert.Single(users.Users);
    }

    [Fact]
    public async Task Login_WrongPasswordIsRejected()
    {
        var users = new FakeUserRepository();
        var tokens = new FakeRefreshTokenRepository();
        var service = CreateService(users, tokens, new FakeAccessTokenProvider());

        await service.RegisterAsync(
            new RegisterUserCommand("member@example.com", "StrongPass123!", "Member"));

        var result = await service.LoginAsync(
            new LoginUserCommand("member@example.com", "WrongPass123!"));

        Assert.False(result.Succeeded);
        Assert.Equal("invalid_credentials", result.ErrorCode);
    }

    [Fact]
    public async Task Refresh_RotatesRefreshTokenAndRejectsOldToken()
    {
        var users = new FakeUserRepository();
        var tokens = new FakeRefreshTokenRepository();
        var service = CreateService(users, tokens, new FakeAccessTokenProvider());

        var registration = await service.RegisterAsync(
            new RegisterUserCommand("member@example.com", "StrongPass123!", "Member"));

        var originalToken = registration.Value!.RefreshToken;
        var refreshed = await service.RefreshAsync(originalToken);
        var replay = await service.RefreshAsync(originalToken);

        Assert.True(refreshed.Succeeded);
        Assert.NotEqual(originalToken, refreshed.Value!.RefreshToken);
        Assert.False(replay.Succeeded);
        Assert.Equal("invalid_refresh_token", replay.ErrorCode);
        Assert.Equal(2, tokens.Tokens.Count);
        Assert.NotNull(tokens.Tokens[0].RevokedAt);
        Assert.Equal(tokens.Tokens[1].Id, tokens.Tokens[0].ReplacedByTokenId);
    }

    [Fact]
    public async Task Revoke_InvalidatesRefreshSession()
    {
        var users = new FakeUserRepository();
        var tokens = new FakeRefreshTokenRepository();
        var service = CreateService(users, tokens, new FakeAccessTokenProvider());

        var registration = await service.RegisterAsync(
            new RegisterUserCommand("member@example.com", "StrongPass123!", "Member"));

        await service.RevokeAsync(registration.Value!.RefreshToken);
        var refresh = await service.RefreshAsync(registration.Value.RefreshToken);

        Assert.False(refresh.Succeeded);
        Assert.Equal("invalid_refresh_token", refresh.ErrorCode);
    }

    [Fact]
    public async Task Login_DisabledAccountIsRejected()
    {
        var users = new FakeUserRepository();
        var tokens = new FakeRefreshTokenRepository();
        var service = CreateService(users, tokens, new FakeAccessTokenProvider());

        await service.RegisterAsync(
            new RegisterUserCommand("member@example.com", "StrongPass123!", "Member"));

        users.Users.Single().Status = AccountStatus.Disabled;

        var result = await service.LoginAsync(
            new LoginUserCommand("member@example.com", "StrongPass123!"));

        Assert.False(result.Succeeded);
        Assert.Equal("account_disabled", result.ErrorCode);
    }

    [Fact]
    public async Task Refresh_DisabledAccountIsRejected()
    {
        var users = new FakeUserRepository();
        var tokens = new FakeRefreshTokenRepository();
        var service = CreateService(users, tokens, new FakeAccessTokenProvider());

        var registration = await service.RegisterAsync(
            new RegisterUserCommand("member@example.com", "StrongPass123!", "Member"));

        users.Users.Single().Status = AccountStatus.Disabled;

        var result = await service.RefreshAsync(registration.Value!.RefreshToken);

        Assert.False(result.Succeeded);
        Assert.Equal("invalid_refresh_token", result.ErrorCode);
    }
    [Fact]
    public async Task ProfileUpdate_CompletesProfileWhenRequiredFieldsArePresent()
    {
        var users = new FakeUserRepository();
        var user = new User
        {
            Email = "member@example.com",
            NormalizedEmail = "MEMBER@EXAMPLE.COM",
            DisplayName = "Member",
            PasswordHash = "not-used",
            Profile = new UserProfile
            {
                TimeZone = "UTC",
                PreferredMealFrequency = 3
            }
        };
        user.Profile.UserId = user.Id;
        users.Users.Add(user);

        var service = new ProfileService(users, TimeProvider.System);
        var result = await service.UpdateAsync(
            user.Id,
            new UpdateProfileCommand(
                "Updated Member",
                2003,
                "UTC",
                new TimeOnly(6, 30),
                new TimeOnly(23, 0),
                3,
                "Plant-forward"));

        Assert.True(result.Succeeded);
        Assert.True(result.Value!.ProfileCompleted);
        Assert.Equal("Updated Member", result.Value.DisplayName);
        Assert.Equal(2003, result.Value.BirthYear);
    }

    private sealed class FakeAccessTokenProvider : IAccessTokenProvider
    {
        private int _counter;

        public AccessTokenResult Create(User user)
        {
            _counter++;
            return new AccessTokenResult(
                $"access-token-{_counter}",
                DateTimeOffset.UtcNow.AddMinutes(15));
        }
    }

    private sealed class FakeUserRepository : IUserRepository
    {
        public List<User> Users { get; } = [];

        public Task<bool> EmailExistsAsync(string normalizedEmail, CancellationToken cancellationToken = default) =>
            Task.FromResult(Users.Any(x => x.NormalizedEmail == normalizedEmail));

        public Task<User?> FindByEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default) =>
            Task.FromResult(Users.FirstOrDefault(x => x.NormalizedEmail == normalizedEmail));

        public Task<User?> FindByIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
            Task.FromResult(Users.FirstOrDefault(x => x.Id == userId));

        public Task AddAsync(User user, CancellationToken cancellationToken = default)
        {
            user.Profile ??= new UserProfile { UserId = user.Id };
            user.Profile.UserId = user.Id;
            Users.Add(user);
            return Task.CompletedTask;
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private sealed class FakeRefreshTokenRepository : IRefreshTokenRepository
    {
        public List<RefreshToken> Tokens { get; } = [];

        public Task<RefreshToken?> FindByHashAsync(string tokenHash, CancellationToken cancellationToken = default) =>
            Task.FromResult(Tokens.FirstOrDefault(x => x.TokenHash == tokenHash));

        public Task AddAsync(RefreshToken token, CancellationToken cancellationToken = default)
        {
            Tokens.Add(token);
            return Task.CompletedTask;
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
    }
}
