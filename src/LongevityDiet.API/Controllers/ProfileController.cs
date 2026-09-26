using LongevityDiet.API.Contracts.Profile;
using LongevityDiet.API.Errors;
using LongevityDiet.API.Security;
using LongevityDiet.Services.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LongevityDiet.API.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/profile")]
public sealed class ProfileController(
    ProfileService profileService,
    ICurrentUser currentUser) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<ProfileResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProfileResponse>> Get(CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId)
        {
            return Unauthorized();
        }

        var result = await profileService.GetAsync(userId, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return this.ToProblem(result, StatusCodes.Status404NotFound);
        }

        return Ok(ToResponse(result.Value));
    }

    [HttpPut]
    [ProducesResponseType<ProfileResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProfileResponse>> Update(
        UpdateProfileRequest request,
        CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId)
        {
            return Unauthorized();
        }

        var result = await profileService.UpdateAsync(
            userId,
            new UpdateProfileCommand(
                request.DisplayName,
                request.BirthYear,
                request.TimeZone,
                request.WakeTime,
                request.SleepTime,
                request.PreferredMealFrequency,
                request.FoodPreference),
            cancellationToken);

        if (!result.Succeeded || result.Value is null)
        {
            return this.ToProblem(result);
        }

        return Ok(ToResponse(result.Value));
    }

    private static ProfileResponse ToResponse(ProfileSummary profile) =>
        new(
            profile.UserId,
            profile.Email,
            profile.DisplayName,
            profile.BirthYear,
            profile.TimeZone,
            profile.WakeTime,
            profile.SleepTime,
            profile.PreferredMealFrequency,
            profile.FoodPreference,
            profile.ProfileCompleted);
}
