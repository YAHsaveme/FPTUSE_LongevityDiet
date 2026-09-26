using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace LongevityDiet.IntegrationTests;

public sealed class IdentityApiTests : IClassFixture<IntegrationTestWebApplicationFactory>
{
    private readonly IntegrationTestWebApplicationFactory _factory;

    public IdentityApiTests(IntegrationTestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetProfile_WithoutAccessToken_ReturnsUnauthorized()
    {
        await _factory.ResetDatabaseAsync();
        using var client = _factory.CreateHttpsClient();

        var response = await client.GetAsync("/api/v1/profile");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Register_DuplicateEmail_ReturnsConflictProblemDetails()
    {
        await _factory.ResetDatabaseAsync();
        using var client = _factory.CreateHttpsClient();

        var payload = CreateRegistration();

        var first = await client.PostAsJsonAsync("/api/v1/auth/register", payload);
        var second = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            payload with { Email = payload.Email.ToUpperInvariant() });

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
        Assert.Equal("application/problem+json", second.Content.Headers.ContentType?.MediaType);

        var problem = await second.Content.ReadFromJsonAsync<ProblemDetailsResponse>();
        Assert.NotNull(problem);
        Assert.Equal(409, problem.Status);
        Assert.Equal("email_exists", problem.Title);
        Assert.False(string.IsNullOrWhiteSpace(problem.Detail));
    }

    [Fact]
    public async Task Register_SetsSecureHttpOnlyStrictRefreshCookie()
    {
        await _factory.ResetDatabaseAsync();
        using var client = _factory.CreateHttpsClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            CreateRegistration());

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var setCookie = Assert.Single(
            response.Headers.GetValues("Set-Cookie"),
            value => value.StartsWith("ldc_refresh=", StringComparison.OrdinalIgnoreCase));

        Assert.Contains("httponly", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("secure", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("path=/api/v1/auth", setCookie, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Login_WithWrongPassword_ReturnsUnauthorized()
    {
        await _factory.ResetDatabaseAsync();
        using var client = _factory.CreateHttpsClient();

        var payload = CreateRegistration();
        var register = await client.PostAsJsonAsync("/api/v1/auth/register", payload);
        Assert.Equal(HttpStatusCode.Created, register.StatusCode);

        var login = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new { payload.Email, Password = "WrongPassword123!" });

        Assert.Equal(HttpStatusCode.Unauthorized, login.StatusCode);
    }

    [Fact]
    public async Task Login_DisabledAccount_ReturnsForbidden()
    {
        await _factory.ResetDatabaseAsync();
        using var client = _factory.CreateHttpsClient();

        var payload = CreateRegistration();
        var register = await client.PostAsJsonAsync("/api/v1/auth/register", payload);
        Assert.Equal(HttpStatusCode.Created, register.StatusCode);

        await _factory.DisableUserAsync(payload.Email);

        var login = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new { payload.Email, payload.Password });

        Assert.Equal(HttpStatusCode.Forbidden, login.StatusCode);

        var problem = await login.Content.ReadFromJsonAsync<ProblemDetailsResponse>();
        Assert.NotNull(problem);
        Assert.Equal("account_disabled", problem.Title);
    }

    [Fact]
    public async Task Register_ProfileRefreshAndRevoke_FlowWorks()
    {
        await _factory.ResetDatabaseAsync();
        using var client = _factory.CreateHttpsClient();

        var register = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            CreateRegistration());

        Assert.Equal(HttpStatusCode.Created, register.StatusCode);

        var session = await register.Content.ReadFromJsonAsync<AuthSessionResponse>();
        Assert.NotNull(session);
        Assert.False(session.User.ProfileCompleted);
        Assert.False(string.IsNullOrWhiteSpace(session.AccessToken));

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", session.AccessToken);

        var initialProfile = await client.GetAsync("/api/v1/profile");
        Assert.Equal(HttpStatusCode.OK, initialProfile.StatusCode);

        var updateProfile = await client.PutAsJsonAsync(
            "/api/v1/profile",
            new
            {
                DisplayName = "Integration Member",
                BirthYear = 2003,
                TimeZone = "UTC",
                WakeTime = "06:30:00",
                SleepTime = "23:00:00",
                PreferredMealFrequency = 3,
                FoodPreference = "Plant-forward",
            });

        Assert.Equal(HttpStatusCode.OK, updateProfile.StatusCode);

        var updated = await updateProfile.Content.ReadFromJsonAsync<ProfileResponse>();
        Assert.NotNull(updated);
        Assert.True(updated.ProfileCompleted);
        Assert.Equal("Integration Member", updated.DisplayName);

        var refresh = await client.PostAsync("/api/v1/auth/refresh", content: null);
        Assert.Equal(HttpStatusCode.OK, refresh.StatusCode);

        var refreshed = await refresh.Content.ReadFromJsonAsync<AuthSessionResponse>();
        Assert.NotNull(refreshed);
        Assert.NotEqual(session.AccessToken, refreshed.AccessToken);

        var revoke = await client.PostAsync("/api/v1/auth/revoke", content: null);
        Assert.Equal(HttpStatusCode.NoContent, revoke.StatusCode);

        var refreshAfterRevoke = await client.PostAsync("/api/v1/auth/refresh", content: null);
        Assert.Equal(HttpStatusCode.Unauthorized, refreshAfterRevoke.StatusCode);
    }

    [Fact]
    public async Task OpenApi_ContainsBearerSchemeAndProtectedProfileOperation()
    {
        await _factory.ResetDatabaseAsync();
        using var client = _factory.CreateHttpsClient();

        using var response = await client.GetAsync("/openapi/v1.json");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        var securitySchemes = document.RootElement
            .GetProperty("components")
            .GetProperty("securitySchemes");

        Assert.True(securitySchemes.TryGetProperty("Bearer", out var bearer));
        Assert.Equal("http", bearer.GetProperty("type").GetString());
        Assert.Equal("bearer", bearer.GetProperty("scheme").GetString());

        var profileGet = document.RootElement
            .GetProperty("paths")
            .GetProperty("/api/v1/profile")
            .GetProperty("get");

        var security = profileGet.GetProperty("security");
        Assert.True(security.GetArrayLength() > 0);
        Assert.True(security[0].TryGetProperty("Bearer", out _));
    }

    private static RegistrationRequest CreateRegistration()
    {
        var suffix = Guid.NewGuid().ToString("N");
        return new RegistrationRequest(
            $"member-{suffix}@example.test",
            "StrongPass123!",
            "Integration Member");
    }

    private sealed record RegistrationRequest(
        string Email,
        string Password,
        string DisplayName);

    private sealed record AuthSessionResponse(
        string AccessToken,
        DateTimeOffset AccessTokenExpiresAt,
        SessionUserResponse User);

    private sealed record SessionUserResponse(
        Guid Id,
        string Email,
        string DisplayName,
        string Role,
        bool ProfileCompleted);

    private sealed record ProfileResponse(
        Guid UserId,
        string Email,
        string DisplayName,
        int? BirthYear,
        string TimeZone,
        TimeOnly? WakeTime,
        TimeOnly? SleepTime,
        int PreferredMealFrequency,
        string? FoodPreference,
        bool ProfileCompleted);

    private sealed record ProblemDetailsResponse(
        int? Status,
        string? Title,
        string? Detail);
}
