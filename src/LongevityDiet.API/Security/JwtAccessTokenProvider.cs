using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using LongevityDiet.Domain.Entities;
using LongevityDiet.Services.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace LongevityDiet.API.Security;

public sealed class JwtAccessTokenProvider(
    IOptions<JwtOptions> options,
    TimeProvider timeProvider) : IAccessTokenProvider
{
    private readonly JwtOptions _options = options.Value;

    public AccessTokenResult Create(User user)
    {
        var now = timeProvider.GetUtcNow();
        var expiresAt = now.AddMinutes(Math.Max(1, _options.AccessTokenMinutes));

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.Name, user.DisplayName),
            new(ClaimTypes.Role, user.Role.ToString()),
            new("profile_complete", (user.Profile?.ProfileCompleted ?? false).ToString().ToLowerInvariant())
        };

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: now.UtcDateTime,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        return new AccessTokenResult(
            new JwtSecurityTokenHandler().WriteToken(token),
            expiresAt);
    }
}
