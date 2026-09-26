namespace LongevityDiet.Services.Identity;

public sealed class AuthenticationOptions
{
    public const string SectionName = "Authentication";
    public int RefreshTokenDays { get; set; } = 14;
}
