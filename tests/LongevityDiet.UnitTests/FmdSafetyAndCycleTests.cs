using LongevityDiet.Domain.Entities;
using LongevityDiet.Services.Fmd;

namespace LongevityDiet.UnitTests;

public sealed class FmdSafetyAndCycleTests
{
    [Fact]
    public void FmdSafetyCatalog_EvaluateScreening_AllNegative_ReturnsEligibleForTracking()
    {
        // Arrange
        var answers = new Dictionary<string, bool>
        {
            ["PREGNANT_OR_BREASTFEEDING"] = false,
            ["AGE_OUT_OF_BOUNDS"] = false,
            ["UNDERWEIGHT_BMI"] = false,
            ["EATING_DISORDER_HISTORY"] = false,
            ["DIABETES_MEDICATION"] = false,
            ["ACTIVE_CHEMOTHERAPY_OR_CANCER"] = false,
            ["ORGAN_FAILURE_OR_INFECTION"] = false,
            ["OTHER_MEDICATION"] = false,
            ["LOW_BLOOD_PRESSURE"] = false,
            ["ATHLETE_HEAVY_TRAINING"] = false,
            ["GLUCONEOGENESIS_DISORDER"] = false,
        };

        // Act
        var (status, triggeredCodes, message) = FmdSafetyCatalog.EvaluateScreening(answers);

        // Assert
        Assert.Equal(FmdSafetyStatus.EligibleForTracking, status);
        Assert.Empty(triggeredCodes);
        Assert.Contains("không phải xác nhận", message, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("PREGNANT_OR_BREASTFEEDING")]
    [InlineData("DIABETES_MEDICATION")]
    [InlineData("UNDERWEIGHT_BMI")]
    [InlineData("ACTIVE_CHEMOTHERAPY_OR_CANCER")]
    [InlineData("ORGAN_FAILURE_OR_INFECTION")]
    public void FmdSafetyCatalog_EvaluateScreening_SingleHighRiskFlag_BlocksAndRequiresProfessionalReview(string riskCode)
    {
        // Arrange
        var answers = new Dictionary<string, bool>
        {
            ["PREGNANT_OR_BREASTFEEDING"] = false,
            ["AGE_OUT_OF_BOUNDS"] = false,
            ["UNDERWEIGHT_BMI"] = false,
            ["EATING_DISORDER_HISTORY"] = false,
            ["DIABETES_MEDICATION"] = false,
            ["ACTIVE_CHEMOTHERAPY_OR_CANCER"] = false,
            ["ORGAN_FAILURE_OR_INFECTION"] = false,
            ["OTHER_MEDICATION"] = false,
            ["LOW_BLOOD_PRESSURE"] = false,
            ["ATHLETE_HEAVY_TRAINING"] = false,
            ["GLUCONEOGENESIS_DISORDER"] = false,
        };
        answers[riskCode] = true;

        // Act
        var (status, triggeredCodes, message) = FmdSafetyCatalog.EvaluateScreening(answers);

        // Assert
        Assert.Equal(FmdSafetyStatus.ProfessionalReviewRequired, status);
        Assert.Single(triggeredCodes);
        Assert.Contains(riskCode, triggeredCodes);
        Assert.Contains("tham vấn bác sĩ", message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void FmdSafetyCatalog_EvaluateScreening_MultipleHighRiskFlags_CollectsAllCodes()
    {
        // Arrange
        var answers = new Dictionary<string, bool>
        {
            ["PREGNANT_OR_BREASTFEEDING"] = true,
            ["AGE_OUT_OF_BOUNDS"] = false,
            ["UNDERWEIGHT_BMI"] = false,
            ["EATING_DISORDER_HISTORY"] = false,
            ["DIABETES_MEDICATION"] = true,
            ["ACTIVE_CHEMOTHERAPY_OR_CANCER"] = false,
            ["ORGAN_FAILURE_OR_INFECTION"] = false,
            ["OTHER_MEDICATION"] = false,
            ["LOW_BLOOD_PRESSURE"] = false,
            ["ATHLETE_HEAVY_TRAINING"] = false,
            ["GLUCONEOGENESIS_DISORDER"] = false,
        };

        // Act
        var (status, triggeredCodes, _) = FmdSafetyCatalog.EvaluateScreening(answers);

        // Assert
        Assert.Equal(FmdSafetyStatus.ProfessionalReviewRequired, status);
        Assert.Equal(2, triggeredCodes.Count);
        Assert.Contains("PREGNANT_OR_BREASTFEEDING", triggeredCodes);
        Assert.Contains("DIABETES_MEDICATION", triggeredCodes);
    }

    [Theory]
    [InlineData(1, 1100)]
    [InlineData(2, 800)]
    [InlineData(3, 800)]
    [InlineData(4, 800)]
    [InlineData(5, 800)]
    public void FmdSafetyCatalog_ResolveTargetCaloriesForDay_MatchesValterLongoProtocols(int dayNumber, int expectedCalories)
    {
        // Act
        var targetKcal = FmdSafetyCatalog.ResolveTargetCaloriesForDay(dayNumber);

        // Assert
        Assert.Equal(expectedCalories, targetKcal);
    }

    [Fact]
    public void FmdSafetyCatalog_ResolveTargetCaloriesForDay_RejectsDaysOutsideFiveDayProtocol()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => FmdSafetyCatalog.ResolveTargetCaloriesForDay(6));
        Assert.Throws<ArgumentOutOfRangeException>(() => FmdSafetyCatalog.ResolveTargetCaloriesForDay(0));
    }

    [Fact]
    public void FmdSafetyCatalog_IncompleteQuestionnaire_NeverTreatsMissingAnswersAsNoRisk()
    {
        var answers = new Dictionary<string, bool> { ["PREGNANT_OR_BREASTFEEDING"] = false };
        var (status, missing, message) = FmdSafetyCatalog.EvaluateScreening(answers);
        Assert.Equal(FmdSafetyStatus.AssessmentRequired, status);
        Assert.Contains("OTHER_MEDICATION", missing);
        Assert.Contains("Chưa trả lời đầy đủ", message);
    }

    [Theory]
    [InlineData("OTHER_MEDICATION")]
    [InlineData("LOW_BLOOD_PRESSURE")]
    [InlineData("ATHLETE_HEAVY_TRAINING")]
    [InlineData("GLUCONEOGENESIS_DISORDER")]
    public void FmdSafetyCatalog_NewBookContraindications_RequireReview(string riskCode)
    {
        var answers = FmdSafetyCatalog.ScreeningQuestions.ToDictionary(x => x.QuestionId, _ => false);
        answers[riskCode] = true;
        var (status, triggered, _) = FmdSafetyCatalog.EvaluateScreening(answers);
        Assert.Equal(FmdSafetyStatus.ProfessionalReviewRequired, status);
        Assert.Contains(riskCode, triggered);
    }

    [Fact]
    public void FmdSafetyCatalog_EducationContent_ContainsRequiredMedicalDisclaimersAndCitations()
    {
        // Arrange
        var education = FmdSafetyCatalog.DefaultEducation;

        // Assert
        Assert.False(string.IsNullOrWhiteSpace(education.Version));
        Assert.Contains("KHÔNG PHẢI là thiết bị y tế", education.ScopeDisclaimer);
        Assert.NotEmpty(education.KeyPrinciples);
        Assert.NotEmpty(education.AbsoluteContraindications);
        Assert.True(education.Citations.Count >= 2);
    }
}
