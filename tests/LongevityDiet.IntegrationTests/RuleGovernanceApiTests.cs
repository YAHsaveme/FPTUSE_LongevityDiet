using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace LongevityDiet.IntegrationTests;

public sealed class RuleGovernanceApiTests : IClassFixture<IntegrationTestWebApplicationFactory>
{
    private readonly IntegrationTestWebApplicationFactory _factory;

    public RuleGovernanceApiTests(IntegrationTestWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task RuleLifecycle_RequiresReview_RecordsAuditAndPreservesHistory()
    {
        await _factory.ResetDatabaseAsync();
        using var client = _factory.CreateHttpsClient();
        await AuthenticateAsync(client, admin: true);
        var (ruleId, versionId) = await CreateRuleVersionAsync(client);

        var prematurePublish = await client.PostAsync($"/api/v1/admin/rule-versions/{versionId}/publication", null);
        Assert.Equal(HttpStatusCode.Conflict, prematurePublish.StatusCode);

        var submit = await client.PostAsync($"/api/v1/admin/rule-versions/{versionId}/review", null);
        Assert.Equal(HttpStatusCode.OK, submit.StatusCode);
        Assert.Equal(4, await ReadStateAsync(submit));

        var editDuringReview = await client.PutAsJsonAsync(
            $"/api/v1/admin/rule-versions/{versionId}", VersionInput("{\"weight\":2}"));
        Assert.Equal(HttpStatusCode.Conflict, editDuringReview.StatusCode);

        var reject = await client.PostAsync($"/api/v1/admin/rule-versions/{versionId}/rejection", null);
        Assert.Equal(HttpStatusCode.OK, reject.StatusCode);
        Assert.Equal(1, await ReadStateAsync(reject));

        var editDraft = await client.PutAsJsonAsync(
            $"/api/v1/admin/rule-versions/{versionId}", VersionInput("{\"weight\":2}"));
        Assert.Equal(HttpStatusCode.OK, editDraft.StatusCode);

        var resubmit = await client.PostAsync($"/api/v1/admin/rule-versions/{versionId}/review", null);
        Assert.Equal(HttpStatusCode.OK, resubmit.StatusCode);

        var publish = await client.PostAsync($"/api/v1/admin/rule-versions/{versionId}/publication", null);
        Assert.Equal(HttpStatusCode.OK, publish.StatusCode);
        Assert.Equal(2, await ReadStateAsync(publish));

        var publishAgain = await client.PostAsync($"/api/v1/admin/rule-versions/{versionId}/publication", null);
        Assert.Equal(HttpStatusCode.Conflict, publishAgain.StatusCode);

        var retire = await client.PostAsync($"/api/v1/admin/rule-versions/{versionId}/retirement", null);
        Assert.Equal(HttpStatusCode.OK, retire.StatusCode);
        Assert.Equal(3, await ReadStateAsync(retire));

        var editRetired = await client.PutAsJsonAsync(
            $"/api/v1/admin/rule-versions/{versionId}", VersionInput("{\"weight\":3}"));
        Assert.Equal(HttpStatusCode.Conflict, editRetired.StatusCode);

        var reReviewRetired = await client.PostAsync($"/api/v1/admin/rule-versions/{versionId}/review", null);
        Assert.Equal(HttpStatusCode.Conflict, reReviewRetired.StatusCode);

        var editRuleMetadata = await client.PutAsJsonAsync(
            $"/api/v1/admin/diet-rules/{ruleId}",
            new { RuleKey = "LIFECYCLE_RULE", Title = "Rewritten", Description = "Should remain immutable",
                  Category = "Pattern", IsMedicalSensitive = false });
        Assert.Equal(HttpStatusCode.Conflict, editRuleMetadata.StatusCode);

        var history = await client.GetAsync($"/api/v1/admin/rule-versions/{versionId}/history?page=1&pageSize=20");
        Assert.Equal(HttpStatusCode.OK, history.StatusCode);
        using var historyJson = JsonDocument.Parse(await history.Content.ReadAsStringAsync());
        Assert.Equal(7, historyJson.RootElement.GetProperty("totalItems").GetInt32());
        var actions = historyJson.RootElement.GetProperty("items")
            .EnumerateArray().Select(item => item.GetProperty("action").GetString()).ToArray();
        Assert.Equal("Retired,Published,Submitted,Edited,Rejected,Submitted,Created", string.Join(',', actions));
        Assert.All(historyJson.RootElement.GetProperty("items").EnumerateArray(), item =>
            Assert.NotEqual(Guid.Empty, item.GetProperty("actorId").GetGuid()));

        var publishedHistory = await client.GetAsync(
            $"/api/v1/admin/rule-versions/{versionId}/history?page=1&pageSize=1&action=Published");
        Assert.Equal(HttpStatusCode.OK, publishedHistory.StatusCode);
        using var filteredJson = JsonDocument.Parse(await publishedHistory.Content.ReadAsStringAsync());
        Assert.Equal(1, filteredJson.RootElement.GetProperty("totalItems").GetInt32());
        Assert.Equal("Published", Assert.Single(filteredJson.RootElement.GetProperty("items").EnumerateArray())
            .GetProperty("action").GetString());
    }

    [Fact]
    public async Task MemberCannotAccessRuleGovernanceOperationsOrAudit()
    {
        await _factory.ResetDatabaseAsync();
        using var client = _factory.CreateHttpsClient();
        await AuthenticateAsync(client, admin: false);

        var versionId = Guid.NewGuid();
        var submit = await client.PostAsync($"/api/v1/admin/rule-versions/{versionId}/review", null);
        var history = await client.GetAsync($"/api/v1/admin/rule-versions/{versionId}/history");
        var publish = await client.PostAsync($"/api/v1/admin/rule-versions/{versionId}/publication", null);

        Assert.Equal(HttpStatusCode.Forbidden, submit.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, history.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, publish.StatusCode);
    }

    [Fact]
    public async Task InvalidJsonAndHistoryParameters_ReturnProblemDetails()
    {
        await _factory.ResetDatabaseAsync();
        using var client = _factory.CreateHttpsClient();
        await AuthenticateAsync(client, admin: true);

        var (ruleId, versionId) = await CreateRuleVersionAsync(client);
        var invalidJson = await client.PostAsJsonAsync(
            $"/api/v1/admin/diet-rules/{ruleId}/versions", VersionInput("{invalid"));
        Assert.Equal(HttpStatusCode.BadRequest, invalidJson.StatusCode);
        Assert.Equal("application/problem+json", invalidJson.Content.Headers.ContentType?.MediaType);

        var invalidHistory = await client.GetAsync(
            $"/api/v1/admin/rule-versions/{versionId}/history?pageSize=101");
        Assert.Equal(HttpStatusCode.BadRequest, invalidHistory.StatusCode);

        var invalidFilter = await client.GetAsync(
            $"/api/v1/admin/rule-versions/{versionId}/history?action=Unknown");
        Assert.Equal(HttpStatusCode.BadRequest, invalidFilter.StatusCode);
    }

    private static async Task<int> ReadStateAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.GetProperty("state").GetInt32();
    }

    private static object VersionInput(string parametersJson) => new
    {
        ParametersJson = parametersJson,
        SourceUrl = "https://example.org/official-guidance",
        SourceType = 2,
        Citation = "Test fixture provenance (not clinical guidance)",
        EvidenceLevel = 2,
        EffectiveAt = (DateTimeOffset?)null,
    };

    private static async Task<(Guid RuleId, Guid VersionId)> CreateRuleVersionAsync(HttpClient client)
    {
        var ruleResponse = await client.PostAsJsonAsync("/api/v1/admin/diet-rules", new
        {
            RuleKey = "LIFECYCLE_RULE",
            Title = "Review lifecycle",
            Description = "Test rule for version governance",
            Category = "Pattern",
            IsMedicalSensitive = false,
        });
        Assert.Equal(HttpStatusCode.Created, ruleResponse.StatusCode);
        using var ruleJson = JsonDocument.Parse(await ruleResponse.Content.ReadAsStringAsync());
        var ruleId = ruleJson.RootElement.GetProperty("id").GetGuid();

        var versionResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/diet-rules/{ruleId}/versions", VersionInput("{\"weight\":1}"));
        Assert.Equal(HttpStatusCode.Created, versionResponse.StatusCode);
        using var versionJson = JsonDocument.Parse(await versionResponse.Content.ReadAsStringAsync());
        return (ruleId, versionJson.RootElement.GetProperty("id").GetGuid());
    }

    private async Task AuthenticateAsync(HttpClient client, bool admin)
    {
        var email = $"governance-{Guid.NewGuid():N}@example.test";
        const string password = "StrongPass123!";
        var registration = await client.PostAsJsonAsync(
            "/api/v1/auth/register", new { Email = email, Password = password, DisplayName = "Governance Tester" });
        Assert.Equal(HttpStatusCode.Created, registration.StatusCode);

        if (admin)
        {
            await _factory.PromoteUserToAdminAsync(email);
        }

        var login = await client.PostAsJsonAsync("/api/v1/auth/login", new { Email = email, Password = password });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        using var loginJson = JsonDocument.Parse(await login.Content.ReadAsStringAsync());
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer", loginJson.RootElement.GetProperty("accessToken").GetString());
    }
}
