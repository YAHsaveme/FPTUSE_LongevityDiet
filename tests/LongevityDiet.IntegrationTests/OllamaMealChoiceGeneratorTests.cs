using System.Net;
using System.Text;
using System.Text.Json;
using LongevityDiet.API.AI;
using LongevityDiet.Domain.Entities;
using LongevityDiet.Services.Planning;
using Microsoft.Extensions.Configuration;

namespace LongevityDiet.IntegrationTests;

public sealed class OllamaMealChoiceGeneratorTests
{
    [Fact]
    public async Task StructuredLocalAiResponse_ReturnsOnlySafeAllowedCodesAndDoesNotInventNutrients()
    {
        var date = new DateOnly(2026, 11, 16);
        var responsePayload = new
        {
            response = JsonSerializer.Serialize(new
            {
                choices = new object[]
                {
                    new { date = "2026-11-16", slot = "Lunch", candidateCode = "CAT-EXISTING" },
                    new { date = "2026-11-16", slot = "Dinner", candidateCode = "CAT-EXISTING" },
                    new { date = "2026-11-16", slot = "Lunch", candidateCode = "FABRICATED-DRUG" },
                    new { date = "2026-11-17", slot = "Lunch", candidateCode = "CAT-EXISTING" },
                }
            })
        };
        using var handler = new FakeOllamaHandler(JsonSerializer.Serialize(responsePayload));
        using var client = new HttpClient(handler)
        {
            BaseAddress = new Uri("http://localhost:11434/")
        };
        var settings = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["MealPlanningAI:Model"] = "qa-fake-model"
            })
            .Build();
        var generator = new OllamaMealChoiceGenerator(client, settings);
        var allowed = new[]
        {
            new AiMealChoiceOption(date, MealSlotType.Lunch,
                [new AiAllowedCandidate("CAT-EXISTING", "Approved lentil meal", true, true, false)])
        };

        var selected = await generator.SuggestAsync(allowed);
        var onlyChoice = Assert.Single(selected);
        Assert.Equal(date, onlyChoice.Date);
        Assert.Equal(MealSlotType.Lunch, onlyChoice.Slot);
        Assert.Equal("CAT-EXISTING", onlyChoice.CandidateCode);
        Assert.NotNull(handler.Body);
        Assert.Contains("CAT-EXISTING", handler.Body, StringComparison.Ordinal);
        Assert.DoesNotContain("password", handler.Body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("birthYear", handler.Body, StringComparison.OrdinalIgnoreCase);
    }

    private sealed class FakeOllamaHandler(string jsonResponse) : HttpMessageHandler
    {
        public string? Body { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Assert.Equal(HttpMethod.Post, request.Method);
            Assert.EndsWith("/api/generate", request.RequestUri!.AbsolutePath,
                StringComparison.OrdinalIgnoreCase);
            Body = await request.Content!.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(jsonResponse, Encoding.UTF8, "application/json")
            };
        }
    }
}
