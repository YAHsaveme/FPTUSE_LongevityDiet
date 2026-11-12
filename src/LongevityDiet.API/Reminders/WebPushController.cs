using LongevityDiet.API.Security;
using LongevityDiet.Domain.Entities;
using LongevityDiet.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LongevityDiet.API.Reminders;

/// <summary>
/// Strict, owner-scoped device subscription API. Endpoints never expose other
/// users' push capability URLs, and never return VAPID private keys.
/// </summary>
[ApiController]
[Authorize]
[EnableRateLimiting("member-api")]
[Route("api/v1/web-push")]
public sealed class WebPushController(
    ICurrentUser current, IConfiguration config,
    WebPushSubscriptionStore subscriptions,
    LongevityDietDbContext db) : ControllerBase
{
    [HttpGet("config")]
    public IActionResult Configuration() => Ok(new
    {
        enabled = WebPushSubscriptionStore.Enabled(config),
        vapidPublicKey = WebPushSubscriptionStore.Enabled(config)
            ? config["WebPush:PublicKey"] : null,
        mode = "background-web-push"
    });

    [HttpGet("devices/count")]
    public async Task<IActionResult> DeviceCount()
    {
        if (current.UserId is not { } id) return Unauthorized();
        if (!WebPushSubscriptionStore.Enabled(config))
            return Ok(new { enabled = false, count = 0 });
        return Ok(new
        {
            enabled = true,
            count = await subscriptions.CountAsync(id)
        });
    }

    [HttpPost("subscriptions")]
    public async Task<IActionResult> Subscribe(
        [FromBody] WebPushSubscriptionInput input, CancellationToken ct)
    {
        if (current.UserId is not { } userId) return Unauthorized();
        if (!WebPushSubscriptionStore.Enabled(config))
            return StatusCode(503, new { error = "webpush_disabled" });
        if (!WebPushSubscriptionStore.IsSafe(input))
            return BadRequest(new { error = "invalid_push_provider_or_keys" });

        var user = await db.Users.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == userId, ct);
        var preference = await db.ReminderPreferences.AsNoTracking()
            .SingleOrDefaultAsync(x => x.UserId == userId, ct);
        if (user is not { Status: AccountStatus.Active })
            return StatusCode(403, new { error = "inactive_user" });
        if (preference is not { OptedIn: true })
            return StatusCode(403, new { error = "enable_reminders_before_push" });

        if (!await subscriptions.SaveAsync(userId, input))
            return Conflict(new { error = "push_device_limit" });
        return Ok(new { registered = true });
    }

    [HttpDelete("subscriptions")]
    public async Task<IActionResult> Unsubscribe(
        [FromBody] WebPushUnsubscribeInput input)
    {
        if (current.UserId is not { } id) return Unauthorized();
        if (string.IsNullOrWhiteSpace(input?.Endpoint) ||
            input.Endpoint.Length > 2048)
            return BadRequest(new { error = "invalid_subscription" });
        if (WebPushSubscriptionStore.Enabled(config))
            await subscriptions.RemoveAsync(id, input.Endpoint);
        return NoContent();
    }
}
