namespace LongevityDiet.Domain.Entities;

/// <summary>
/// Self-reported context used for a wellness safety gate; never a medical diagnosis.
/// No free-text medical history is stored in this screening.
/// </summary>
public sealed class WellnessScreening
{
    public Guid UserId { get; set; }
    public string RiskFlagsCsv { get; set; } = string.Empty;
    public bool AllergiesReviewed { get; set; }
    public string ReviewedAllergiesCsv { get; set; } = string.Empty;
    public DateTimeOffset ReviewedAt { get; set; }
}

public sealed class WellnessCheckIn
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public DateOnly LocalDate { get; set; }
    public string Phase { get; set; } = "During";
    public int Energy { get; set; }
    public int Mood { get; set; }
    public int Digestion { get; set; }
    public int SleepQuality { get; set; }
    public string SymptomsCsv { get; set; } = string.Empty;
    public string BodyChangesCsv { get; set; } = string.Empty;
    public decimal? WeightKg { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset RecordedAt { get; set; }
}
