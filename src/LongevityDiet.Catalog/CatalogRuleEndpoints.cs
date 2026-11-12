using System.Security.Claims;
using System.Text.Json;
using LongevityDiet.Domain.Catalog;
using LongevityDiet.Domain.Catalog.Entities;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace LongevityDiet.Catalog;

// Opt-in Catalog-owned governance; no reads or writes to the legacy/Planning DB.
// Publication is administrative review, not an endorsement of medical evidence.
public static class CatalogRuleEndpoints
{
    public static void MapRuleOwnerEndpoints(this RouteGroupBuilder api, RouteGroupBuilder admin)
    {
        api.MapGet("/diet-rules/{id:guid}", async (Guid id, CatalogDbContext db,
            CancellationToken ct) =>
        {
            var rule = await db.DietRules.AsNoTracking().Include(r => r.Versions)
                .FirstOrDefaultAsync(r => r.Id == id && r.IsActive &&
                    r.Versions.Any(v => v.State == RuleVersionState.Published), ct);
            return rule is null ? Results.NotFound() : Results.Ok(RuleDto(rule, member: true));
        });
        admin.MapGet("/diet-rules", async (CatalogDbContext db, CancellationToken ct) =>
        {
            var rules = await db.DietRules.AsNoTracking().Include(r => r.Versions)
                .OrderBy(r => r.RuleKey).ToListAsync(ct);
            return Results.Ok(rules.Select(r => RuleDto(r, member: false)).ToList());
        });
        admin.MapGet("/diet-rules/{id:guid}", async (Guid id, CatalogDbContext db,
            CancellationToken ct) =>
        {
            var rule = await db.DietRules.AsNoTracking().Include(r => r.Versions)
                .FirstOrDefaultAsync(r => r.Id == id, ct);
            return rule is null ? Results.NotFound() : Results.Ok(RuleDto(rule, member: false));
        });
        admin.MapPost("/diet-rules", async (CreateCatalogRule input, CatalogDbContext db,
            CancellationToken ct) =>
        {
            if (!ValidRule(input)) return Results.BadRequest(new { error = "invalid_rule" });
            var key = input.RuleKey!.Trim().ToUpperInvariant();
            if (await db.DietRules.AnyAsync(r => r.RuleKey == key, ct))
                return Results.Conflict(new { error = "duplicate_rule_key" });
            var rule = new DietRule
            {
                RuleKey = key, Title = input.Title!.Trim(),
                Description = input.Description!.Trim(), Category = input.Category!.Trim(),
                IsMedicalSensitive = input.IsMedicalSensitive, IsActive = true
            };
            db.DietRules.Add(rule);
            try { await db.SaveChangesAsync(ct); }
            catch (DbUpdateException) { return Results.Conflict(new { error = "rule_write_conflict" }); }
            return Results.Created($"/api/v1/diet-rules/{rule.Id}", RuleDto(rule, member: false));
        });
        admin.MapPut("/diet-rules/{id:guid}", async (Guid id, CreateCatalogRule input,
            CatalogDbContext db, CancellationToken ct) =>
        {
            if (!ValidRule(input)) return Results.BadRequest(new { error = "invalid_rule" });
            var rule = await db.DietRules.Include(r => r.Versions)
                .FirstOrDefaultAsync(r => r.Id == id, ct);
            if (rule is null) return Results.NotFound();
            if (rule.Versions.Any(v => v.State is RuleVersionState.Published or RuleVersionState.Retired))
                return Results.Conflict(new { error = "published_rule_immutable" });
            var key = input.RuleKey!.Trim().ToUpperInvariant();
            if (await db.DietRules.AnyAsync(r => r.Id != id && r.RuleKey == key, ct))
                return Results.Conflict(new { error = "duplicate_rule_key" });
            rule.RuleKey = key;
            rule.Title = input.Title!.Trim();
            rule.Description = input.Description!.Trim();
            rule.Category = input.Category!.Trim();
            rule.IsMedicalSensitive = input.IsMedicalSensitive;
            rule.UpdatedAt = DateTimeOffset.UtcNow;
            try { await db.SaveChangesAsync(ct); }
            catch (DbUpdateException) { return Results.Conflict(new { error = "rule_write_conflict" }); }
            return Results.Ok(RuleDto(rule, member: false));
        });

        admin.MapPost("/diet-rules/{id:guid}/versions", async (Guid id,
            SaveCatalogRuleVersion input, ClaimsPrincipal principal, CatalogDbContext db,
            CancellationToken ct) =>
        {
            if (!TryActor(principal, out var actor)) return Results.Unauthorized();
            var error = ValidateVersion(input);
            if (error is not null) return Results.BadRequest(new { error });
            var rule = await db.DietRules.AsNoTracking().Where(r => r.Id == id && r.IsActive)
                .Select(r => new { r.Id }).FirstOrDefaultAsync(ct);
            if (rule is null) return Results.NotFound();
            var highest = await db.RuleVersions.Where(v => v.DietRuleId == id)
                .Select(v => (int?)v.VersionNumber).MaxAsync(ct) ?? 0;
            var version = new RuleVersion
            {
                DietRuleId = rule.Id, VersionNumber = highest + 1,
                ParametersJson = input.ParametersJson!.Trim(),
                SourceUrl = input.SourceUrl!.Trim(), SourceType = input.SourceType,
                Citation = input.Citation!.Trim(), EvidenceLevel = input.EvidenceLevel,
                EffectiveAt = input.EffectiveAt, State = RuleVersionState.Draft
            };
            db.RuleVersions.Add(version);
            AddAudit(db, version, actor, "Created", "Draft created");
            try { await db.SaveChangesAsync(ct); }
            catch (DbUpdateException) { return Results.Conflict(new { error = "rule_version_conflict" }); }
            return Results.Created($"/api/v1/admin/rule-versions/{version.Id}", VersionDto(version));
        });

        admin.MapGet("/rule-versions/{id:guid}", async (Guid id, CatalogDbContext db,
            CancellationToken ct) =>
        {
            var version = await db.RuleVersions.AsNoTracking().FirstOrDefaultAsync(v => v.Id == id, ct);
            return version is null ? Results.NotFound() : Results.Ok(VersionDto(version));
        });
        admin.MapPut("/rule-versions/{id:guid}", async (Guid id, SaveCatalogRuleVersion input,
            ClaimsPrincipal principal, CatalogDbContext db, CancellationToken ct) =>
        {
            if (!TryActor(principal, out var actor)) return Results.Unauthorized();
            var error = ValidateVersion(input);
            if (error is not null) return Results.BadRequest(new { error });
            var version = await db.RuleVersions.FirstOrDefaultAsync(v => v.Id == id, ct);
            if (version is null) return Results.NotFound();
            if (version.State != RuleVersionState.Draft)
                return Results.Conflict(new { error = "only_draft_editable" });
            version.ParametersJson = input.ParametersJson!.Trim();
            version.SourceUrl = input.SourceUrl!.Trim();
            version.SourceType = input.SourceType;
            version.Citation = input.Citation!.Trim();
            version.EvidenceLevel = input.EvidenceLevel;
            version.EffectiveAt = input.EffectiveAt;
            version.Revision = Guid.NewGuid();
            AddAudit(db, version, actor, "Edited", "Draft content updated");
            return await SaveVersionAsync(db, version, ct);
        });

        admin.MapPost("/rule-versions/{id:guid}/review",
            (Guid id, ClaimsPrincipal actor, CatalogDbContext db, CancellationToken ct) =>
                TransitionAsync(id, RuleVersionState.Draft, RuleVersionState.InReview, "Submitted",
                    "Submitted for independent review", actor, db, ct));
        admin.MapPost("/rule-versions/{id:guid}/rejection",
            (Guid id, ClaimsPrincipal actor, CatalogDbContext db, CancellationToken ct) =>
                TransitionAsync(id, RuleVersionState.InReview, RuleVersionState.Draft, "Rejected",
                    "Returned to draft", actor, db, ct));
        admin.MapPost("/rule-versions/{id:guid}/publication",
            (Guid id, ClaimsPrincipal actor, CatalogDbContext db, CancellationToken ct) =>
                TransitionAsync(id, RuleVersionState.InReview, RuleVersionState.Published, "Published",
                    "Approved by independent administrator", actor, db, ct));
        admin.MapPost("/rule-versions/{id:guid}/retirement",
            (Guid id, ClaimsPrincipal actor, CatalogDbContext db, CancellationToken ct) =>
                TransitionAsync(id, RuleVersionState.Published, RuleVersionState.Retired, "Retired",
                    "Retired without rewriting historical references", actor, db, ct));

        admin.MapGet("/rule-reviews/queue", async (CatalogDbContext db, int page = 1,
            int pageSize = 20, bool? medicalSensitive = null, CancellationToken ct = default) =>
        {
            if (!ValidPage(page, pageSize)) return Results.BadRequest(new { error = "invalid_page" });
            var query = db.RuleVersions.AsNoTracking().Where(v => v.State == RuleVersionState.InReview);
            if (medicalSensitive.HasValue)
                query = query.Where(v => v.DietRule.IsMedicalSensitive == medicalSensitive.Value);
            var total = await query.CountAsync(ct);
            var items = await query.OrderBy(v => v.CreatedAt).ThenBy(v => v.Id)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .Select(v => new { v.Id, RuleVersionId = v.Id, v.DietRuleId,
                    v.DietRule.RuleKey, v.DietRule.Title, v.VersionNumber,
                    v.DietRule.IsMedicalSensitive, v.State, v.SourceUrl, v.Citation,
                    v.EvidenceLevel, v.CreatedAt }).ToListAsync(ct);
            return Results.Ok(new { items, page, pageSize, totalItems = total });
        });

        admin.MapGet("/rule-versions/{id:guid}/history", async (Guid id, CatalogDbContext db,
            int page = 1, int pageSize = 25, string? action = null, string? search = null,
            CancellationToken ct = default) =>
        {
            if (!ValidPage(page, pageSize) || search?.Length > 200)
                return Results.BadRequest(new { error = "invalid_query" });
            if (!await db.RuleVersions.AnyAsync(v => v.Id == id, ct)) return Results.NotFound();
            var query = db.RuleAudits.AsNoTracking().Where(a => a.RuleVersionId == id);
            if (!string.IsNullOrWhiteSpace(action)) query = query.Where(a => a.Action == action);
            if (!string.IsNullOrWhiteSpace(search)) query = query.Where(a => a.Details.Contains(search));
            var total = await query.CountAsync(ct);
            var items = await query.OrderByDescending(a => a.OccurredAt).ThenByDescending(a => a.Id)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .Select(a => new { a.Id, a.RuleVersionId, a.VersionNumber, a.ActorId,
                    a.OccurredAt, a.Action, a.Details }).ToListAsync(ct);
            return Results.Ok(new { items, page, pageSize, totalItems = total });
        });
    }

    private static bool TryActor(ClaimsPrincipal principal, out Guid actor) =>
        Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out actor);

    private static bool ValidPage(int page, int pageSize) =>
        page >= 1 && pageSize is >= 1 and <= 100 &&
        (long)(page - 1) * pageSize <= int.MaxValue;

    private static bool ValidRule(CreateCatalogRule input) =>
        !string.IsNullOrWhiteSpace(input.RuleKey) && input.RuleKey.Length <= 100 &&
        !string.IsNullOrWhiteSpace(input.Title) && input.Title.Length <= 200 &&
        !string.IsNullOrWhiteSpace(input.Description) && input.Description.Length <= 2000 &&
        !string.IsNullOrWhiteSpace(input.Category) && input.Category.Length <= 80;

    private static string? ValidateVersion(SaveCatalogRuleVersion input)
    {
        if (string.IsNullOrWhiteSpace(input.SourceUrl) || string.IsNullOrWhiteSpace(input.Citation))
            return "missing_provenance";
        if (input.SourceUrl.Length > 1000 || input.Citation.Length > 1000 ||
            !Enum.IsDefined(input.SourceType) || !Enum.IsDefined(input.EvidenceLevel))
            return "invalid_provenance";
        if (!Uri.TryCreate(input.SourceUrl, UriKind.Absolute, out var uri) ||
            uri.Scheme is not ("https" or "http"))
            return "invalid_source_url";
        if (string.IsNullOrWhiteSpace(input.ParametersJson) ||
            input.ParametersJson.Length > 16000) return "invalid_parameters";
        try
        {
            using var document = JsonDocument.Parse(input.ParametersJson,
                new JsonDocumentOptions { MaxDepth = 16 });
            if (document.RootElement.ValueKind != JsonValueKind.Object ||
                DuplicateProperty(document.RootElement)) return "invalid_parameters";
        }
        catch (JsonException) { return "invalid_parameters"; }
        return null;
    }

    private static bool DuplicateProperty(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            var names = new HashSet<string>(StringComparer.Ordinal);
            return element.EnumerateObject().Any(p => !names.Add(p.Name) || DuplicateProperty(p.Value));
        }
        return element.ValueKind == JsonValueKind.Array && element.EnumerateArray().Any(DuplicateProperty);
    }

    private static async Task<IResult> TransitionAsync(Guid id, RuleVersionState expected,
        RuleVersionState next, string action, string details, ClaimsPrincipal principal,
        CatalogDbContext db, CancellationToken ct)
    {
        if (!TryActor(principal, out var actor)) return Results.Unauthorized();
        var version = await db.RuleVersions.FirstOrDefaultAsync(v => v.Id == id, ct);
        if (version is null) return Results.NotFound();
        if (version.State != expected)
            return Results.Conflict(new { error = "invalid_rule_transition" });
        if (next == RuleVersionState.Published)
        {
            var submittedBy = await db.RuleAudits.AsNoTracking()
                .Where(a => a.RuleVersionId == id && a.Action == "Submitted")
                .OrderByDescending(a => a.OccurredAt).ThenByDescending(a => a.Id)
                .Select(a => (Guid?)a.ActorId).FirstOrDefaultAsync(ct);
            if (submittedBy is null || submittedBy == actor)
                return Results.Conflict(new { error = "independent_review_required" });
        }
        version.State = next;
        version.Revision = Guid.NewGuid();
        if (next == RuleVersionState.Published)
        {
            version.PublishedAt = DateTimeOffset.UtcNow;
            version.EffectiveAt ??= version.PublishedAt;
        }
        AddAudit(db, version, actor, action, details);
        return await SaveVersionAsync(db, version, ct);
    }

    private static void AddAudit(CatalogDbContext db, RuleVersion version, Guid actor,
        string action, string details) => db.RuleAudits.Add(new RuleAudit
        {
            RuleVersionId = version.Id, VersionNumber = version.VersionNumber,
            ActorId = actor, OccurredAt = DateTimeOffset.UtcNow,
            Action = action, Details = details
        });

    private static async Task<IResult> SaveVersionAsync(CatalogDbContext db,
        RuleVersion version, CancellationToken ct)
    {
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException)
        { return Results.Conflict(new { error = "rule_version_conflict" }); }
        catch (DbUpdateException)
        { return Results.Conflict(new { error = "rule_write_conflict" }); }
        return Results.Ok(VersionDto(version));
    }

    private static object RuleDto(DietRule rule, bool member) => new
    {
        rule.Id, rule.RuleKey, rule.Title, rule.Description, rule.Category,
        rule.IsMedicalSensitive, rule.IsActive,
        Versions = rule.Versions.Where(v => !member || v.State == RuleVersionState.Published)
            .OrderBy(v => v.VersionNumber).Select(VersionDto).ToArray()
    };

    private static object VersionDto(RuleVersion v) => new
    {
        v.Id, v.DietRuleId, v.VersionNumber, v.ParametersJson,
        v.SourceUrl, v.SourceType, v.Citation, v.EvidenceLevel,
        v.State, v.EffectiveAt, v.PublishedAt, v.CreatedAt
    };
}

public sealed record CreateCatalogRule(
    string? RuleKey, string? Title, string? Description, string? Category, bool IsMedicalSensitive);

public sealed record SaveCatalogRuleVersion(
    string? ParametersJson, string? SourceUrl, SourceType SourceType,
    string? Citation, EvidenceLevel EvidenceLevel, DateTimeOffset? EffectiveAt);
