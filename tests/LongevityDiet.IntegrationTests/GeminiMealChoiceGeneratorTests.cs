using System.Net;
using System.Text;
using System.Text.Json;
using LongevityDiet.API.AI;
using LongevityDiet.Domain.Entities;
using LongevityDiet.Services.Planning;
using Microsoft.Extensions.Configuration;

namespace LongevityDiet.IntegrationTests;

public sealed class GeminiMealChoiceGeneratorTests
{
    private static readonly DateOnly Day = new(2026, 11, 17);

    [Fact]
    public async Task GeminiHttpJson_UsesServerSideKeyAndRejectsInventedOrMisdatedCodes()
    {
        var jsonChoices = JsonSerializer.Serialize(new
        {
            choices = new object[]
            {
                new { date = "2026-11-17", slot = "Lunch", candidateCode = "CAT-EXISTING" },
                new { date = "2026-11-17", slot = "Lunch", candidateCode = "BAD-CURE" },
                new { date = "2026-11-18", slot = "Lunch", candidateCode = "CAT-EXISTING" },
                new { date = "2026-11-17", slot = "Dinner", candidateCode = "CAT-EXISTING" },
            }
        });
        var reply = JsonSerializer.Serialize(new
        {
            candidates = new[]
            {
                new
                {
                    content = new { parts = new[] { new { text = jsonChoices } } },
                    finishReason = "STOP",
                }
            }
        });

        using var handler = new FakeGeminiHandler(reply, HttpStatusCode.OK);
        using var client = NewClient(handler);
        var generator = new GeminiMealChoiceGenerator(client, Settings("unit-test-only-not-real"));

        var results = await generator.SuggestAsync(Options);
        var result = Assert.Single(results);
        Assert.Equal(Day, result.Date);
        Assert.Equal(MealSlotType.Lunch, result.Slot);
        Assert.Equal("CAT-EXISTING", result.CandidateCode);
        Assert.Equal("/v1beta/models/gemini-3.5-flash-lite:generateContent", handler.RequestPath);
        Assert.True(handler.KeyHeaderPresent);
        Assert.Equal("unit-test-only-not-real", handler.KeyHeaderValue);
        Assert.NotNull(handler.Body);
        Assert.Contains("CAT-EXISTING", handler.Body);
        Assert.Contains("responseMimeType", handler.Body);
        Assert.Contains("application/json", handler.Body);
        Assert.DoesNotContain("unit-test-only-not-real", handler.Body);
        Assert.DoesNotContain("birthYear", handler.Body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("diagnosis", handler.Body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task GeminiMissingKey_DoesNotSendAnyExternalRequest()
    {
        using var handler = new FakeGeminiHandler("{}", HttpStatusCode.OK);
        using var client = NewClient(handler);
        var generator = new GeminiMealChoiceGenerator(client, Settings(null));
        Assert.Empty(await generator.SuggestAsync(Options));
        Assert.Equal(0, handler.RequestCount);
    }

    [Fact]
    public async Task GeminiRateLimited_ThrowsButNeverLeaksKeyInException()
    {
        using var handler = new FakeGeminiHandler("{}", HttpStatusCode.TooManyRequests);
        using var client = NewClient(handler);
        var generator = new GeminiMealChoiceGenerator(client, Settings("test-dont-expose-secret"));

        var ex = await Assert.ThrowsAsync<HttpRequestException>(
            () => generator.SuggestAsync(Options));
        Assert.DoesNotContain("test-dont-expose-secret", ex.ToString());
        Assert.Equal(1, handler.RequestCount);
    }

    [Fact]
    public async Task GeminiIncompleteResult_IsRejected()
    {
        var reply = JsonSerializer.Serialize(new
        {
            candidates = new[]
            {
                new
                {
                    content = new
                    {
                        parts = new[]
                        {
                            new { text = "{\"choices\":[{\"date\":\"2026-11-17\",\"slot\":\"Lunch\",\"candidateCode\":\"CAT-EXISTING\"}]}" }
                        }
                    },
                    finishReason = "MAX_TOKENS",
                }
            }
        });
        using var handler = new FakeGeminiHandler(reply, HttpStatusCode.OK);
        using var client = NewClient(handler);
        var generator = new GeminiMealChoiceGenerator(client, Settings("test"));
        Assert.Empty(await generator.SuggestAsync(Options));
    }

    private static AiMealChoiceOption[] Options =>
    [
        new(Day, MealSlotType.Lunch,
            [new AiAllowedCandidate("CAT-EXISTING", "Plant lentil lunch", true, true, false)])
    ];

    private static IConfiguration Settings(string? key) =>
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Gemini:ApiKey"] = key,
            ["Gemini:Model"] = "gemini-3.5-flash-lite"
        }).Build();

    private static HttpClient NewClient(HttpMessageHandler handler) =>
        new(handler) { BaseAddress = new Uri("https://generativelanguage.googleapis.com/") };

    private sealed class FakeGeminiHandler(string response, HttpStatusCode status) : HttpMessageHandler
    {
        public int RequestCount { get; private set; }
        public string? RequestPath { get; private set; }
        public string? Body { get; private set; }
        public bool KeyHeaderPresent { get; private set; }
        public string? KeyHeaderValue { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            RequestCount++;
            Assert.Equal(HttpMethod.Post, request.Method);
            Assert.Equal("generativelanguage.googleapis.com", request.RequestUri?.Host);
            Assert.Equal("https", request.RequestUri?.Scheme);
            RequestPath = request.RequestUri?.AbsolutePath;
            KeyHeaderPresent = request.Headers.Contains("x-goog-api-key");
            KeyHeaderValue = request.Headers.TryGetValues("x-goog-api-key", out var values)
                ? values.Single()
                : null;
            Body = await request.Content!.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(status)
            {
                Content = new StringContent(response, Encoding.UTF8, "application/json")
            };
        }
    }
}
