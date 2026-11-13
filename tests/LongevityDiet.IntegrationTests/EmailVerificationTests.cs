using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using LongevityDiet.API.Reminders;
using LongevityDiet.Domain.Entities;
using LongevityDiet.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace LongevityDiet.IntegrationTests;

public sealed class EmailVerificationTests : IClassFixture<IntegrationTestWebApplicationFactory>
{
    private readonly IntegrationTestWebApplicationFactory factory;
    public EmailVerificationTests(IntegrationTestWebApplicationFactory factory) =>
        this.factory = factory;

    [Fact]
    public void VerificationProofIsUserBoundAndUsesStrongHmac()
    {
        var secret = RandomNumberGenerator.GetBytes(32);
        var alice = Guid.NewGuid();
        var bob = Guid.NewGuid();
        var proof = EmailVerificationService.HashCode(secret, alice,
            "ALICE@EXAMPLE.TEST", "012345");
        Assert.Equal(64, proof.Length);
        Assert.NotEqual(proof, EmailVerificationService.HashCode(
            secret, bob, "ALICE@EXAMPLE.TEST", "012345"));
        Assert.NotEqual(proof, EmailVerificationService.HashCode(
            secret, alice, "BOB@EXAMPLE.TEST", "012345"));
        Assert.NotEqual(proof, EmailVerificationService.HashCode(
            secret, alice, "ALICE@EXAMPLE.TEST", "012346"));
        Assert.Throws<ArgumentException>(() =>
            EmailVerificationService.HashCode(secret, alice,
                "ALICE@EXAMPLE.TEST", "abc123"));
        Assert.Throws<ArgumentException>(() =>
            EmailVerificationService.HashCode(new byte[2], alice,
                "ALICE@EXAMPLE.TEST", "000000"));
    }

    [Fact]
    public async Task VerificationDisabledByDefaultAndRequiresAuthentication()
    {
        await factory.ResetDatabaseAsync();
        using var anonymous = factory.CreateHttpsClient();
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await anonymous.GetAsync("/api/v1/email-verification/status")).StatusCode);
        using var client = await RegisteredAsync();
        var state = await client.GetFromJsonAsync<EmailVerificationStatus>(
            "/api/v1/email-verification/status");
        Assert.NotNull(state);
        Assert.False(state.Enabled);
        Assert.False(state.Verified);
        Assert.Equal(HttpStatusCode.ServiceUnavailable,
            (await client.PostAsJsonAsync("/api/v1/email-verification/request",
                new { })).StatusCode);
    }

    [Fact]
    public async Task WrongProofNeverVerifiesAndCorrectProofIsSingleUse()
    {
        await factory.ResetDatabaseAsync();
        using var client = await RegisteredAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LongevityDietDbContext>();
        var user = await db.Users.SingleAsync();
        Assert.Null(user.EmailVerifiedAtUtc);
        var code = "827194";
        var key = RandomNumberGenerator.GetBytes(32);
        var config = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["EmailVerification:Enabled"] = "true",
                ["EmailVerification:HashKeyBase64"] = Convert.ToBase64String(key)
            }).Build();
        var service = new EmailVerificationService(db, config,
            scope.ServiceProvider.GetRequiredService<IHostEnvironment>(),
            TimeProvider.System);
        user.EmailVerificationHash = EmailVerificationService.HashCode(
            key, user.Id, user.NormalizedEmail, code);
        user.EmailVerificationExpiresAtUtc = DateTime.UtcNow.AddMinutes(10);
        user.EmailVerificationLastSentAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var wrong = await service.ConfirmAsync(user.Id, "000000", default);
        Assert.Equal(400, wrong.Status);
        Assert.Null((await db.Users.AsNoTracking().SingleAsync()).EmailVerifiedAtUtc);
        Assert.Equal(1, (await db.Users.AsNoTracking().SingleAsync()).EmailVerificationAttempts);

        var valid = await service.ConfirmAsync(user.Id, code, default);
        Assert.Equal(200, valid.Status);
        Assert.Equal("email_verified", valid.Code);
        var proof = await db.Users.AsNoTracking().SingleAsync();
        Assert.NotNull(proof.EmailVerifiedAtUtc);
        Assert.Null(proof.EmailVerificationHash);
        Assert.Null(proof.EmailVerificationExpiresAtUtc);
        Assert.Equal(0, proof.EmailVerificationAttempts);
        Assert.Equal("already_verified",
            (await service.ConfirmAsync(user.Id, code, default)).Code);
    }

    [Theory]
    [InlineData(-1, 0, 400)]
    [InlineData(10, 5, 429)]
    public async Task ExpiredOrLockedVerificationCodeIsRejected(
        int expiryMinutes, int failedAttempts, int expectedStatus)
    {
        await factory.ResetDatabaseAsync();
        using var client = await RegisteredAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LongevityDietDbContext>();
        var account = await db.Users.SingleAsync();
        var key = RandomNumberGenerator.GetBytes(32);
        var code = "123789";
        var config = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["EmailVerification:Enabled"] = "true",
                ["EmailVerification:HashKeyBase64"] = Convert.ToBase64String(key)
            }).Build();
        account.EmailVerificationHash = EmailVerificationService.HashCode(
            key, account.Id, account.NormalizedEmail, code);
        account.EmailVerificationExpiresAtUtc = DateTime.UtcNow.AddMinutes(expiryMinutes);
        account.EmailVerificationAttempts = failedAttempts;
        await db.SaveChangesAsync();

        var service = new EmailVerificationService(db, config,
            scope.ServiceProvider.GetRequiredService<IHostEnvironment>(),
            TimeProvider.System);
        var result = await service.ConfirmAsync(account.Id, code, default);
        Assert.Equal(expectedStatus, result.Status);
        Assert.Null((await db.Users.AsNoTracking().SingleAsync()).EmailVerifiedAtUtc);
    }

    [Fact]
    public void ProductionEmailVerificationRequiresConfiguredMailAndSigningKey()
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["EmailVerification:Enabled"] = "true",
                ["EmailNotifications:Enabled"] = "false"
            }).Build();
        using var scope = factory.Services.CreateScope();
        Assert.Throws<InvalidOperationException>(() =>
            EmailVerificationService.EnsureConfigured(config,
                scope.ServiceProvider.GetRequiredService<IHostEnvironment>()));
    }

    private async Task<HttpClient> RegisteredAsync()
    {
        var client = factory.CreateHttpsClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new
        {
            email = $"verify-{Guid.NewGuid():N}@example.test",
            password = "StrongPass123!",
            displayName = "Email QA Member"
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var session = await response.Content.ReadFromJsonAsync<
            System.Text.Json.JsonElement>();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue(
                "Bearer", session.GetProperty("accessToken").GetString());
        return client;
    }
}
