namespace LongevityDiet.API.Security;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "LongevityDiet.API";
    public string Audience { get; set; } = "LongevityDiet.Web";
    public string SigningKey { get; set; } = string.Empty;
    public int AccessTokenMinutes { get; set; } = 15;
}
