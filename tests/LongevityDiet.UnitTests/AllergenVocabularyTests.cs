using LongevityDiet.Services.Planning;

namespace LongevityDiet.UnitTests;

public sealed class AllergenVocabularyTests
{
    [Theory]
    [InlineData("đậu phộng", "peanut")]
    [InlineData("lạc", "peanut")]
    [InlineData("đậu nành", "soy")]
    [InlineData("tôm", "shellfish")]
    [InlineData("cua", "shellfish")]
    [InlineData("cá", "fish")]
    [InlineData("sữa", "dairy")]
    [InlineData("trứng", "egg")]
    [InlineData("mè", "sesame")]
    [InlineData("vừng", "sesame")]
    [InlineData("lúa mì", "wheat")]
    [InlineData("hạt óc chó", "tree-nut")]
    [InlineData("hạt điều", "cashew")]
    [InlineData("hải sản", "shellfish")]
    [InlineData("hải sản", "fish")]
    public void CommonVietnameseAndEnglishAllergens_ResolveToSafetyTokens(string input, string expected)
    {
        Assert.Contains(expected, AllergenVocabulary.Expand([input]));
    }

    [Theory]
    [InlineData("peanut", true)]
    [InlineData("đậu phộng", true)]
    [InlineData("tôm", true)]
    [InlineData("fish", true)]
    [InlineData("shrimp", true)]
    [InlineData("hạt điều", true)]
    [InlineData("unrecognized wild herb", false)]
    [InlineData("", false)]
    public void AllergenRecognition_FailsClosedForUnsupportedTerms(string term, bool expected) =>
        Assert.Equal(expected, AllergenVocabulary.IsKnown(term));

    [Fact]
    public void UnknownAllergen_IsNotDiscarded()
    {
        Assert.Contains("unlisted allergen", AllergenVocabulary.Expand(["unlisted allergen"]));
    }
}
