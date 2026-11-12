using System.Globalization;
using System.Text;

namespace LongevityDiet.Services.Planning;

/// <summary>
/// Small explicit vocabulary for matching common English/Vietnamese allergen names.
/// It improves filtering but never certifies ingredients or cross-contact safety.
/// </summary>
public static class AllergenVocabulary
{
    private static readonly HashSet<string> RecognizedCanonicalCodes =
        new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "peanut", "soy", "soybean", "shellfish", "shrimp", "crab", "fish",
            "milk", "dairy", "egg", "sesame", "wheat", "gluten",
            "walnut", "cashew", "almond", "tree-nut"
        };

    /// <summary>
    /// Unknown or ambiguous allergen terms require manual review.
    /// A lack of a matching tag must never be interpreted as safety.
    /// </summary>
    public static bool IsKnown(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        if (RecognizedCanonicalCodes.Contains(value.Trim())) return true;
        var expanded = Expand([value]);
        return expanded.Any(RecognizedCanonicalCodes.Contains);
    }

    public static IReadOnlySet<string> Expand(IEnumerable<string> declared)
    {
        var result = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var value in declared)
        {
            if (string.IsNullOrWhiteSpace(value))
                continue;
            var key = Fold(value);
            var codes = key switch
            {
                "dau phong" or "lac" or "peanuts" or "peanut" => ["peanut"],
                "dau nanh" or "dau tuong" or "soybean" or "soybeans" or "soy" or "soya" => ["soy", "soybean"],
                "tom" or "cua" or "shellfish" or "crustacean" or "crustaceans" => ["shellfish", "shrimp", "crab"],
                "hai san" or "seafood" => ["shellfish", "shrimp", "crab", "fish"],
                "ca" or "fish" => ["fish"],
                "sua" or "milk" or "dairy" => ["milk", "dairy"],
                "trung" or "trung ga" or "egg" or "eggs" => ["egg"],
                "me" or "vung" or "sesame" => ["sesame"],
                "lua mi" or "wheat" => ["wheat", "gluten"],
                "hat oc cho" or "walnut" or "walnuts" => ["walnut", "tree-nut"],
                "hat dieu" or "cashew" or "cashews" => ["cashew", "tree-nut"],
                "hanh nhan" or "almond" or "almonds" => ["almond", "tree-nut"],
                "hat cay" or "tree nut" or "tree nuts" => ["tree-nut"],
                "gluten" => ["gluten", "wheat"],
                _ => Array.Empty<string>()
            };
            if (codes.Length > 0)
                result.UnionWith(codes);
            else
                result.Add(value.Trim().ToLowerInvariant());
        }
        return result;
    }

    private static string Fold(string value)
    {
        var decomposition = value.ToLowerInvariant().Replace('đ', 'd')
            .Replace('-', ' ').Replace('_', ' ').Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposition.Length);
        foreach (var c in decomposition)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark)
                continue;
            builder.Append(c);
        }
        return string.Join(' ', builder.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }
}
