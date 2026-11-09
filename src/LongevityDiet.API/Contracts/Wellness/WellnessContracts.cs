using System.ComponentModel.DataAnnotations;

namespace LongevityDiet.API.Contracts.Wellness;

public sealed record UpdateWellnessScreeningRequest(
    [Required] IReadOnlyList<string> RiskFlags,
    bool AllergiesReviewed,
    [Required] IReadOnlyList<string> Allergies);

public sealed record SaveWellnessCheckInRequest(
    DateOnly LocalDate,
    [Required] string Phase,
    [Range(1, 5)] int Energy,
    [Range(1, 5)] int Mood,
    [Range(1, 5)] int Digestion,
    [Range(1, 5)] int SleepQuality,
    [Required] IReadOnlyList<string> Symptoms,
    [Required] IReadOnlyList<string> BodyChanges,
    [Range(20, 350)] decimal? WeightKg,
    [MaxLength(500)] string? Notes);
