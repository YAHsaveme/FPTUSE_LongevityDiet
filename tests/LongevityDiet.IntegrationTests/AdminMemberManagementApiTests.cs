using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using LongevityDiet.Repositories;

namespace LongevityDiet.IntegrationTests;

public sealed class AdminMemberManagementApiTests : IClassFixture<IntegrationTestWebApplicationFactory>
{
    private readonly IntegrationTestWebApplicationFactory _factory;
    public AdminMemberManagementApiTests(IntegrationTestWebApplicationFactory factory) => _factory = factory;

    private static async Task<(Guid Id, string Token)> Register(
        HttpClient client, string email)
    {
        var reply = await client.PostAsJsonAsync("/api/v1/auth/register", new
        {
            Email = email, Password = "StrongTest1234", DisplayName = "Synthetic QA Member"
        });
        Assert.Equal(HttpStatusCode.Created, reply.StatusCode);
        using var json = JsonDocument.Parse(await reply.Content.ReadAsStringAsync());
        return (
            json.RootElement.GetProperty("user").GetProperty("id").GetGuid(),
            json.RootElement.GetProperty("accessToken").GetString()!);
    }

    private async Task<(HttpClient Client, Guid Id)> CreateAdmin()
    {
        var client = _factory.CreateHttpsClient();
        var email = "admin-directory-" + Guid.NewGuid().ToString("N") + "@example.test";
        var account = await Register(client, email);
        await _factory.PromoteUserToAdminAsync(email);
        var response = await client.PostAsJsonAsync("/api/v1/auth/login",
            new { Email = email, Password = "StrongTest1234" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var token = json.RootElement.GetProperty("accessToken").GetString()!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return (client, account.Id);
    }

    [Fact]
    public async Task Directory_RequiresAdmin_AndOmitsHealthInformation()
    {
        await _factory.ResetDatabaseAsync();
        using var member = _factory.CreateHttpsClient();
        var email = "member-directory-" + Guid.NewGuid().ToString("N") + "@example.test";
        var account = await Register(member, email);
        member.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", account.Token);
        var forbidden = await member.GetAsync("/api/v1/admin/members");
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);

        using var anonymous = _factory.CreateHttpsClient();
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await anonymous.GetAsync("/api/v1/admin/members")).StatusCode);

        var (admin, adminId) = await CreateAdmin();
        using (admin)
        {
            var response = await admin.GetAsync("/api/v1/admin/members?page=1&pageSize=10&search=" + email);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var text = await response.Content.ReadAsStringAsync();
            Assert.Contains(email, text);
            Assert.DoesNotContain("passwordHash", text, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("allergies", text, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("mealPlan", text, StringComparison.OrdinalIgnoreCase);
            using var json = JsonDocument.Parse(text);
            Assert.Equal(1, json.RootElement.GetProperty("totalItems").GetInt32());
            Assert.Equal(account.Id, json.RootElement.GetProperty("items")[0].GetProperty("id").GetGuid());

            var wrongRole = await admin.GetAsync("/api/v1/admin/members/" + adminId);
            Assert.Equal(HttpStatusCode.NotFound, wrongRole.StatusCode);
            var badPage = await admin.GetAsync("/api/v1/admin/members?page=0");
            Assert.Equal(HttpStatusCode.BadRequest, badPage.StatusCode);
            var badSize = await admin.GetAsync("/api/v1/admin/members?pageSize=1000");
            Assert.Equal(HttpStatusCode.BadRequest, badSize.StatusCode);
        }
    }

    [Fact]
    public async Task Disable_RevokesTokens_RecordsAudit_AndOldJwtStaysRejectedAfterReenable()
    {
        await _factory.ResetDatabaseAsync();
        using var member = _factory.CreateHttpsClient();
        var email = "qa-lock-" + Guid.NewGuid().ToString("N") + "@example.test";
        var memberAccount = await Register(member, email);
        member.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", memberAccount.Token);
        Assert.Equal(HttpStatusCode.OK, (await member.GetAsync("/api/v1/profile")).StatusCode);

        var (admin, _) = await CreateAdmin();
        using (admin)
        {
            var locked = await admin.PatchAsJsonAsync(
                "/api/v1/admin/members/" + memberAccount.Id + "/status",
                new { Status = "Disabled", Reason = "QA: review a synthetic account" });
            Assert.Equal(HttpStatusCode.OK, locked.StatusCode);
            Assert.Equal(HttpStatusCode.Unauthorized,
                (await member.GetAsync("/api/v1/profile")).StatusCode);

            var invalidLogin = await _factory.CreateHttpsClient().PostAsJsonAsync(
                "/api/v1/auth/login", new { Email = email, Password = "StrongTest1234" });
            Assert.Equal(HttpStatusCode.Forbidden, invalidLogin.StatusCode);

            var list = await admin.GetAsync("/api/v1/admin/members?status=disabled&search=" + email);
            Assert.Equal(HttpStatusCode.OK, list.StatusCode);
            Assert.Contains(email, await list.Content.ReadAsStringAsync());

            var unlocked = await admin.PatchAsJsonAsync(
                "/api/v1/admin/members/" + memberAccount.Id + "/status",
                new { Status = "Active", Reason = "QA: synthetic review completed" });
            Assert.Equal(HttpStatusCode.OK, unlocked.StatusCode);

            // Even after unlock, the old bearer token must never become valid again.
            Assert.Equal(HttpStatusCode.Unauthorized,
                (await member.GetAsync("/api/v1/profile")).StatusCode);

            var history = await admin.GetAsync(
                "/api/v1/admin/members/" + memberAccount.Id + "/history");
            Assert.Equal(HttpStatusCode.OK, history.StatusCode);
            using var json = JsonDocument.Parse(await history.Content.ReadAsStringAsync());
            Assert.Equal(2, json.RootElement.GetArrayLength());
            Assert.Equal("Active", json.RootElement[0].GetProperty("newStatus").GetString());
            Assert.Equal("Disabled", json.RootElement[1].GetProperty("newStatus").GetString());

            var loggedInAgain = await _factory.CreateHttpsClient().PostAsJsonAsync(
                "/api/v1/auth/login", new { Email = email, Password = "StrongTest1234" });
            Assert.Equal(HttpStatusCode.OK, loggedInAgain.StatusCode);
        }
    }

    [Fact]
    public async Task Admin_CannotDisableAnotherAdmin_OrSendInvalidStatus()
    {
        await _factory.ResetDatabaseAsync();
        var (admin, adminId) = await CreateAdmin();
        using (admin)
        {
            var attempt = await admin.PatchAsJsonAsync(
                "/api/v1/admin/members/" + adminId + "/status",
                new { Status = "Disabled", Reason = "Trying to remove an administrator" });
            Assert.Equal(HttpStatusCode.NotFound, attempt.StatusCode);

            var invalid = await admin.PatchAsJsonAsync(
                "/api/v1/admin/members/" + Guid.NewGuid() + "/status",
                new { Status = "Promoted", Reason = "Should never modify roles" });
            Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);

            using var dbScope = _factory.Services.CreateScope();
            var db = dbScope.ServiceProvider.GetRequiredService<LongevityDietDbContext>();
            var adminCount = await db.Users.CountAsync(u =>
                u.Id == adminId && u.Status == LongevityDiet.Domain.Entities.AccountStatus.Active);
            Assert.Equal(1, adminCount);
        }
    }
}
