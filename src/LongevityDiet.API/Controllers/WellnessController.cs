using LongevityDiet.API.Contracts.Wellness;
using LongevityDiet.API.Errors;
using LongevityDiet.API.Security;
using LongevityDiet.Services.Wellness;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LongevityDiet.API.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/wellness")]
public sealed class WellnessController(
    WellnessJourneyService journey,
    ICurrentUser currentUser) : ControllerBase
{
    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview(CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId) return Unauthorized();
        return Ok(await journey.GetOverviewAsync(userId, cancellationToken));
    }

    [HttpPut("screening")]
    public async Task<IActionResult> SaveScreening(
        UpdateWellnessScreeningRequest request, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId) return Unauthorized();
        var result = await journey.SaveScreeningAsync(userId,
            new ScreeningCommand(request.RiskFlags, request.AllergiesReviewed, request.Allergies),
            cancellationToken);
        return result.Succeeded ? Ok(result.Value) : this.ToProblem(result);
    }

    [HttpPost("check-ins")]
    public async Task<IActionResult> SaveCheckIn(
        SaveWellnessCheckInRequest request, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId) return Unauthorized();
        var result = await journey.SaveCheckInAsync(userId,
            new CheckInCommand(
                request.LocalDate, request.Phase, request.Energy, request.Mood,
                request.Digestion, request.SleepQuality, request.Symptoms,
                request.BodyChanges, request.WeightKg, request.Notes),
            cancellationToken);
        return result.Succeeded ? Ok(result.Value) : this.ToProblem(result);
    }

    [HttpDelete("check-ins/{checkInId:guid}")]
    public async Task<IActionResult> DeleteCheckIn(Guid checkInId, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId) return Unauthorized();
        var result = await journey.DeleteCheckInAsync(userId, checkInId, cancellationToken);
        return result.Succeeded ? NoContent() : this.ToProblem(result, StatusCodes.Status404NotFound);
    }
}
