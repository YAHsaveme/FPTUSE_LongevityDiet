using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using LongevityDiet.Domain.Entities;
using LongevityDiet.Services.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace LongevityDiet.Identity;

public sealed class IdentityJwtOptions
{
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public string SigningKey { get; set; } = string.Empty;
    public int AccessTokenMinutes { get; set; } = 15;
}

public sealed class IdentityJwtProvider(IOptions<IdentityJwtOptions> options,
    TimeProvider clock) : IAccessTokenProvider
{
    public AccessTokenResult Create(User user)
    {
        var now = clock.GetUtcNow();
        var expiry = now.AddMinutes(Math.Max(1, options.Value.AccessTokenMinutes));
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.Name, user.DisplayName),
            new(ClaimTypes.Role, user.Role.ToString()),
            new("profile_complete", (user.Profile?.ProfileCompleted ?? false).ToString().ToLowerInvariant())
        };
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.Value.SigningKey)),
            SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: options.Value.Issuer, audience: options.Value.Audience,
            claims: claims, notBefore: now.UtcDateTime, expires: expiry.UtcDateTime,
            signingCredentials: credentials);
        return new AccessTokenResult(new JwtSecurityTokenHandler().WriteToken(token), expiry);
    }
}
