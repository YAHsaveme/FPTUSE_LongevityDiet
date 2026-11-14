using LongevityDiet.API.Contracts.Tracking;
using LongevityDiet.API.Errors;
using LongevityDiet.API.Security;
using LongevityDiet.Services.Tracking;
using LongevityDiet.Services.Querying;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LongevityDiet.API.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/challenges")]
public sealed class ChallengesController(ChallengeProgressService service, ICurrentUser currentUser) : ControllerBase
{
    [HttpGet("templates")]
    [ProducesResponseType<IReadOnlyList<ChallengeTemplateSummary>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ChallengeTemplateSummary>>> ListTemplates(CancellationToken cancellationToken)
    {
        var result = await service.ListTemplatesAsync(cancellationToken);
        return Ok(result.Value);
    }

    [HttpPost]
    [ProducesResponseType<UserChallengeSummary>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserChallengeSummary>> Start(StartChallengeRequest request, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId) return Unauthorized();
        var result = await service.StartAsync(userId, request.TemplateId, request.StartDate, cancellationToken);
        if (!result.Succeeded || result.Value is null)
            return result.ErrorCode == "active_challenge_exists"
                ? this.ToProblem(result, StatusCodes.Status409Conflict)
                : this.ToProblem(result);
        return Created($"/api/v1/challenges/{result.Value.Id}", result.Value);
    }

    [HttpGet("current")]
    [ProducesResponseType<UserChallengeSummary>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserChallengeSummary>> GetCurrent(CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId) return Unauthorized();
        var result = await service.GetCurrentAsync(userId, cancellationToken);
        return !result.Succeeded || result.Value is null ? this.ToProblem(result, StatusCodes.Status404NotFound) : Ok(result.Value);
    }

    [HttpGet("history")]
    public async Task<ActionResult<IReadOnlyList<UserChallengeSummary>>> History(CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId) return Unauthorized();
        var result = await service.ListHistoryAsync(userId, cancellationToken);
        return Ok(result.Value);
    }

    [HttpGet("history/page")]
    public async Task<IActionResult> QueryHistory(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] DateOnly? fromDate = null, [FromQuery] DateOnly? toDate = null,
        [FromQuery] string? status = null, [FromQuery] string sortBy = "startDate",
        [FromQuery] string sortDirection = "desc", CancellationToken cancellationToken = default)
    {
        if (currentUser.UserId is not { } userId) return Unauthorized();
        var result = await service.QueryHistoryAsync(userId,
            new CollectionPageQuery(page, pageSize, search, fromDate, toDate,
                status, sortBy, sortDirection), cancellationToken);
        return result.Succeeded && result.Value is not null ? Ok(result.Value) : this.ToProblem(result);
    }

    [HttpPut("{challengeId:guid}/days/{dayNumber:int}")]
    [ProducesResponseType<UserChallengeSummary>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserChallengeSummary>> SetDay(
        Guid challengeId,
        int dayNumber,
        SetChallengeDayCompletionRequest request,
        CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId) return Unauthorized();
        var result = await service.SetDayCompletionAsync(userId, challengeId, dayNumber, request.Completed, cancellationToken);
        if (!result.Succeeded || result.Value is null)
            return result.ErrorCode == "challenge_not_found"
                ? this.ToProblem(result, StatusCodes.Status404NotFound)
                : this.ToProblem(result);
        return Ok(result.Value);
    }
}
