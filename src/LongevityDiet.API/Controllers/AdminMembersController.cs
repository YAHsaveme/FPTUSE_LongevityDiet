using System.Security.Claims;
using LongevityDiet.API.Security;
using LongevityDiet.Domain.Entities;
using LongevityDiet.Repositories.Repositories;
using LongevityDiet.Services.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LongevityDiet.API.Controllers;

public sealed record ChangeMemberStatusRequest(string Status, string Reason);

[ApiController]
[Authorize(Policy = AuthorizationPolicies.AdminOnly)]
[Route("api/v1/admin/members")]
public sealed class AdminMembersController(MemberAdministrationService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<AdminMemberPage>> List(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null, [FromQuery] string status = "all",
        [FromQuery] bool? verified = null, [FromQuery] string sortBy = "createdAt",
        [FromQuery] string sortDirection = "desc",
        CancellationToken cancellationToken = default)
    {
        if (page < 1 || pageSize is < 1 or > 100 ||
            search?.Length > 100 || sortBy is not ("createdAt" or "email" or "name" or "status") ||
            sortDirection is not ("asc" or "desc") ||
            status is not ("all" or "active" or "disabled"))
            return BadRequest(new ProblemDetails { Title = "Invalid member query", Status = 400 });

        AccountStatus? filter = status switch
        {
            "active" => AccountStatus.Active,
            "disabled" => AccountStatus.Disabled,
            _ => null,
        };
        return Ok(await service.FindAsync(search, filter, verified, sortBy,
            sortDirection == "desc", page, pageSize, cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AdminMemberSummary>> Get(
        Guid id, CancellationToken cancellationToken)
    {
        var member = await service.GetAsync(id, cancellationToken);
        return member is null ? NotFound() : Ok(member);
    }

    [HttpGet("{id:guid}/history")]
    public async Task<ActionResult<IReadOnlyList<AdminMemberAuditEntry>>> History(
        Guid id, CancellationToken cancellationToken)
    {
        if (await service.GetAsync(id, cancellationToken) is null) return NotFound();
        return Ok(await service.HistoryAsync(id, cancellationToken));
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<ActionResult<AdminMemberSummary>> SetStatus(
        Guid id, ChangeMemberStatusRequest request, CancellationToken cancellationToken)
    {
        if (request is null ||
            request.Status is not ("Active" or "Disabled") ||
            string.IsNullOrWhiteSpace(request.Reason) ||
            request.Reason.Trim().Length is < 8 or > 300)
            return BadRequest(new ProblemDetails
            {
                Title = "Status must be Active or Disabled, with a reason of 8-300 characters.",
                Status = 400
            });

        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var actorId))
            return Unauthorized();

        var status = request.Status == "Disabled"
            ? AccountStatus.Disabled : AccountStatus.Active;
        var result = await service.ChangeStatusAsync(
            id, actorId, status, request.Reason, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }
}
