using LongevityDiet.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace LongevityDiet.API.Reminders;

/// <summary>
/// Authenticated mailbox proof: a code is sent ONLY to the current account's
/// stored email. User cannot supply or override a recipient in requests.
/// </summary>
[ApiController]
[Authorize]
[EnableRateLimiting("member-api")]
[Route("api/v1/email-verification")]
public sealed class EmailVerificationController(
    ICurrentUser current, EmailVerificationService service) : ControllerBase
{
    [HttpGet("status")]
    public async Task<IActionResult> Status(CancellationToken ct)
    {
        if (current.UserId is not { } id) return Unauthorized();
        return Ok(await service.StatusAsync(id, ct));
    }

    [HttpPost("request")]
    public async Task<IActionResult> RequestCode(CancellationToken ct)
    {
        if (current.UserId is not { } id) return Unauthorized();
        var result = await service.RequestAsync(id, ct);
        return StatusCode(result.Status, new { code = result.Code });
    }

    [HttpPost("confirm")]
    public async Task<IActionResult> Confirm(
        [FromBody] EmailVerificationConfirmRequest? request, CancellationToken ct)
    {
        if (current.UserId is not { } id) return Unauthorized();
        var result = await service.ConfirmAsync(id, request?.Code ?? "", ct);
        return StatusCode(result.Status, new { code = result.Code });
    }
}
