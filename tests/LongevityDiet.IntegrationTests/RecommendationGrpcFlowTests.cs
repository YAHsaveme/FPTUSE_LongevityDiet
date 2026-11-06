extern alias GrpcServer;

using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using LongevityDiet.API.Controllers;
using LongevityDiet.Recommendation.Contracts;
using Grpc.Net.Client;
using Grpc.Core;
using LongevityDiet.Tracking;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using GrpcEndpoint = GrpcServer::LongevityDiet.Recommendation.Grpc.Services.ActivityCoachEndpoint;

namespace LongevityDiet.IntegrationTests;

public sealed class RecommendationGrpcFlowTests
{
    [Fact]
    public async Task AuthorizedRestApi_UsesActualGrpcHttp2_AndSurfacesDowntime()
    {
        // A real Kestrel HTTP/2 listener, not a mocked gRPC client or stubbed response.
        var grpcBuilder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            EnvironmentName = "Testing"
        });
        grpcBuilder.WebHost.ConfigureKestrel(options =>
            options.Listen(IPAddress.Loopback, 0,
                listen => listen.Protocols = HttpProtocols.Http2));
        grpcBuilder.Services.AddGrpc();
        await using var grpcApp = grpcBuilder.Build();
        grpcApp.MapGrpcService<GrpcEndpoint>();
        await grpcApp.StartAsync();

        var server = grpcApp.Services.GetRequiredService<IServer>();
        var url = server.Features.Get<IServerAddressesFeature>()?.Addresses.Single()
            ?? throw new InvalidOperationException("Kestrel has no bound HTTP/2 address.");

        using var channel = GrpcChannel.ForAddress(url);
        var directCoach = new ActivityCoach.ActivityCoachClient(channel);
        var directReply = await directCoach.RecommendAsync(new ActivityProgressRequest
        {
            WeeklyMinutesGoal = 150,
            CompletedMinutes = 35,
            WeeklyStrengthGoal = 2,
            CompletedStrengthSessions = 0
        });
        Assert.Equal("both_remaining", directReply.Status);
        Assert.Equal(115, directReply.RemainingMinutes);

        using var baseFactory = new IntegrationTestWebApplicationFactory();
        await baseFactory.ResetDatabaseAsync();
        using var factory = baseFactory.WithWebHostBuilder(builder =>
            builder.ConfigureAppConfiguration((_, configuration) =>
                configuration.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Grpc:RecommendationUrl"] = url
                })));
        Assert.Equal(url, factory.Services.GetRequiredService<IConfiguration>()["Grpc:RecommendationUrl"]);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

        Assert.Equal(HttpStatusCode.Unauthorized,
            (await client.GetAsync("/api/v1/recommendations/activity")).StatusCode);

        var register = await client.PostAsJsonAsync("/api/v1/auth/register", new
        {
            email = $"coach-{Guid.NewGuid():N}@example.test",
            password = "StrongPass123!",
            displayName = "Activity Coaching Test",
        });
        Assert.Equal(HttpStatusCode.Created, register.StatusCode);
        using (var doc = JsonDocument.Parse(await register.Content.ReadAsStringAsync()))
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
                "Bearer", doc.RootElement.GetProperty("accessToken").GetString());

        using var create = await client.PostAsJsonAsync("/api/v1/activities", new
        {
            kind = 1,
            durationMinutes = 35,
            startedAt = DateTimeOffset.UtcNow.AddMinutes(-1),
            note = "Walking",
        });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);

        var summary = await client.GetFromJsonAsync<ActivitySummary>("/api/v1/activities/summary");
        using var adviceResponse = await client.GetAsync("/api/v1/recommendations/activity");
        Assert.Equal(HttpStatusCode.OK, adviceResponse.StatusCode);
        var advice = await adviceResponse.Content.ReadFromJsonAsync<ActivityAdviceView>();
        Assert.NotNull(advice);
        Assert.Equal(summary!.EquivalentMinutes, advice.CompletedMinutes);
        Assert.Equal(summary.WeeklyMinutesTarget, advice.WeeklyMinutesGoal);
        Assert.Equal(Math.Max(0, summary.WeeklyMinutesTarget - summary.EquivalentMinutes),
            advice.RemainingMinutes);
        Assert.Equal(Math.Max(0, summary.WeeklyStrengthSessionsTarget - summary.StrengthSessions),
            advice.RemainingStrengthSessions);
        Assert.Contains("không phải lời khuyên y khoa", advice.Disclaimer, StringComparison.Ordinal);
        Assert.NotEmpty(advice.Guidance);

        // A second authenticated member must not inherit the first member's activity.
        using var other = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });
        var otherRegister = await other.PostAsJsonAsync("/api/v1/auth/register", new
        {
            email = $"coach-other-{Guid.NewGuid():N}@example.test",
            password = "StrongPass123!",
            displayName = "Other Member"
        });
        Assert.Equal(HttpStatusCode.Created, otherRegister.StatusCode);
        using (var otherDoc = JsonDocument.Parse(await otherRegister.Content.ReadAsStringAsync()))
            other.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
                "Bearer", otherDoc.RootElement.GetProperty("accessToken").GetString());
        var otherAdvice = await other.GetFromJsonAsync<ActivityAdviceView>(
            "/api/v1/recommendations/activity");
        Assert.NotNull(otherAdvice);
        Assert.Equal(0, otherAdvice.CompletedMinutes);
        Assert.NotEqual(advice.CompletedMinutes, otherAdvice.CompletedMinutes);

        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.GetAsync("/api/v1/recommendations/activity?weekStart=2026-11-03")).StatusCode);

        // No silently fabricated advice when the independent service becomes unavailable.
        await grpcApp.StopAsync();
        using var unavailable = await client.GetAsync("/api/v1/recommendations/activity");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, unavailable.StatusCode);
        using var problem = JsonDocument.Parse(await unavailable.Content.ReadAsStringAsync());
        Assert.Equal("recommendation_unavailable",
            problem.RootElement.GetProperty("title").GetString());
    }
}
