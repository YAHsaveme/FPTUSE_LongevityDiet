using LongevityDiet.Domain.Entities;

namespace LongevityDiet.Services.Wellness;

/// <summary>
/// Conservative routing policy, not clinical risk stratification or diagnosis.
/// Flag codes are user-reported; medical questions require qualified review.
/// </summary>
public static class WellnessSafetyPolicy
{
    public static readonly IReadOnlySet<string> AllowedFlags = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "pregnancy", "breastfeeding", "diabetes_medication", "kidney_disease",
        "eating_disorder_history", "frailty", "unintentional_weight_loss",
        "complex_chronic_condition", "swallowing_difficulty", "none"
    };

    private static readonly IReadOnlySet<string> HighRiskFlags = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "pregnancy", "breastfeeding", "diabetes_medication", "kidney_disease",
        "eating_disorder_history", "frailty", "unintentional_weight_loss",
        "complex_chronic_condition", "swallowing_difficulty"
    };

    public static (string Segment, bool RequiresProfessionalReview, string Guidance) Assess(
        int? birthYear, IEnumerable<string> riskFlags, int year)
    {
        var flags = riskFlags.ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (birthYear is null)
            return ("AgeUnverified", true, "Add your birth year in Profile before using the rolling plan.");
        if (birthYear is { } yearOfBirth && year - yearOfBirth < 18)
            return ("Adolescent", true, "Children and adolescents need age-appropriate professional dietary advice.");

        if (flags.Overlaps(HighRiskFlags))
            return ("ProfessionalReviewRequired", true, "Do not self-prescribe a restrictive diet. Consult a qualified clinician or dietitian.");

        if (birthYear is { } yearBorn && year - yearBorn >= 65)
            return ("OlderAdult", false, "Older adults may have distinct protein and nutrient needs; review adequacy with a dietitian.");

        return ("AdultGeneral", false, "General wellness guidance only. This is not a treatment plan or a lifespan prediction.");
    }

    /// <summary>Repeated lowest self-ratings call for review, not a diagnosis.</summary>
    public static bool RequiresWellbeingReview(IEnumerable<WellnessCheckIn> checkIns, DateOnly today) =>
        checkIns.Where(x => x.Phase == "During" && x.LocalDate >= today.AddDays(-6) &&
            x.LocalDate <= today &&
            (x.Energy <= 1 || x.Mood <= 1 || x.Digestion <= 1 || x.SleepQuality <= 1))
            .Select(x => x.LocalDate)
            .Distinct()
            .Take(2)
            .Count() >= 2;

    public static bool IsUrgent(IEnumerable<string> symptomTags) =>
        symptomTags.Any(x => x is "breathing_difficulty" or "fainting" or "throat_swelling");

    public static bool IsValidRiskFlags(IReadOnlyList<string> flags) =>
        flags.All(x => AllowedFlags.Contains(x)) &&
        !(flags.Contains("none", StringComparer.OrdinalIgnoreCase) && flags.Count > 1);
}
