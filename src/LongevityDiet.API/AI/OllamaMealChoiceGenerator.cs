using System.Net.Http.Json;
using System.Text.Json;
using LongevityDiet.Domain.Entities;
using LongevityDiet.Services.Planning;

namespace LongevityDiet.API.AI;

/// <summary>
/// Opt-in Ollama bridge: model sees only safe, prefiltered candidate codes and
/// titles. Its replies are strictly revalidated by the deterministic rule engine.
/// </summary>
public sealed class OllamaMealChoiceGenerator(HttpClient client, IConfiguration configuration)
    : IAiMealChoiceGenerator
{
    public async Task<IReadOnlyList<AiMealChoice>> SuggestAsync(
        IReadOnlyList<AiMealChoiceOption> allowedOptions,
        CancellationToken cancellationToken = default)
    {
        var model = configuration["MealPlanningAI:Model"];
        if (string.IsNullOrWhiteSpace(model) || allowedOptions.Count == 0)
            return [];

        var options = allowedOptions.Select(option => new
        {
            date = option.Date.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture),
            slot = option.Slot.ToString(),
            allowed = option.Candidates.Select(c => new
            {
                code = c.Code, title = c.Title,
                legume = c.HasLegumes, wholeGrain = c.HasWholeGrains, fish = c.ContainsFish,
            })
        });
        const string instructions = """
            You are a menu candidate selector, NOT a medical professional.
            Use ONLY the supplied allowed candidate codes. Never invent foods,
            nutritional values, allergies, medical advice or evidence citations.
            Prefer varied, mostly plant-forward meals with legumes and whole grains.
            Source principles: https://www.fondazionevalterlongo.org/en/longevity-diet-for-adults/
            No full text of the copyrighted book was provided.
            Return one JSON object ONLY:
            {"choices":[{"date":"YYYY-MM-DD","slot":"Breakfast","candidateCode":"..."}]}
            """;
        var request = new
        {
            model, stream = false, format = "json",
            prompt = instructions + "\nALLOWED_OPTIONS_JSON:\n" + JsonSerializer.Serialize(options),
            options = new { temperature = 0.2, num_predict = 2500 }
        };

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(25));
        using var response = await client.PostAsJsonAsync("api/generate", request, timeout.Token);
        response.EnsureSuccessStatusCode();

        using var envelope = await JsonDocument.ParseAsync(
            await response.Content.ReadAsStreamAsync(timeout.Token), cancellationToken: timeout.Token);
        if (!envelope.RootElement.TryGetProperty("response", out var modelOutput) ||
            modelOutput.ValueKind != JsonValueKind.String ||
            string.IsNullOrWhiteSpace(modelOutput.GetString()))
            return [];
        using var parsed = JsonDocument.Parse(modelOutput.GetString()!);
        if (!parsed.RootElement.TryGetProperty("choices", out var choices) ||
            choices.ValueKind != JsonValueKind.Array)
            return [];

        var allowed = allowedOptions.ToDictionary(
            x => (x.Date, x.Slot),
            x => x.Candidates.Select(c => c.Code).ToHashSet(StringComparer.OrdinalIgnoreCase));
        var selections = new List<AiMealChoice>();
        foreach (var item in choices.EnumerateArray().Take(60))
        {
            if (!item.TryGetProperty("date", out var dateValue) ||
                dateValue.ValueKind != JsonValueKind.String ||
                !DateOnly.TryParseExact(dateValue.GetString(), "yyyy-MM-dd", out var date) ||
                !item.TryGetProperty("slot", out var slotValue) ||
                slotValue.ValueKind != JsonValueKind.String ||
                !Enum.TryParse<MealSlotType>(slotValue.GetString(), true, out var slot) ||
                !item.TryGetProperty("candidateCode", out var codeValue) ||
                codeValue.ValueKind != JsonValueKind.String)
                continue;
            var code = codeValue.GetString();
            if (code is not null &&
                allowed.TryGetValue((date, slot), out var accepted) && accepted.Contains(code) &&
                !selections.Any(choice => choice.Date == date && choice.Slot == slot))
                selections.Add(new AiMealChoice(date, slot, code));
        }
        return selections;
    }
}
