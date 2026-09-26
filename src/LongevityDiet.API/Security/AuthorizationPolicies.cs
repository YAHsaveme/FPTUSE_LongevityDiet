using LongevityDiet.Domain.Entities;
using Microsoft.AspNetCore.Authorization;

namespace LongevityDiet.API.Security;

public static class AuthorizationPolicies
{
    public const string AdminOnly = "AdminOnly";

    public static void Configure(AuthorizationOptions options)
    {
        options.AddPolicy(
            AdminOnly,
            policy => policy
                .RequireAuthenticatedUser()
                .RequireRole(UserRole.Admin.ToString()));
    }
}
