using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using LongevityDiet.Domain.Catalog;
using LongevityDiet.Domain.Catalog.Entities;
using LongevityDiet.Repositories.Catalog.Repositories;

namespace LongevityDiet.Services.Catalog;

public sealed class RuleCatalogService(
    IRuleCatalogRepository rules,
    TimeProvider timeProvider)
{
    public async Task<CatalogServiceResult<IReadOnlyList<DietRuleDto>>> GetActiveRulesAsync(
        CancellationToken cancellationToken = default)
    {
        var items = await rules.GetActiveRulesAsync(cancellationToken);
        return CatalogServiceResult.Success<IReadOnlyList<DietRuleDto>>(
            items.Select(ToRuleDto).ToList());
    }

    public async Task<CatalogServiceResult<IReadOnlyList<DietRuleDto>>> GetAllRulesAsync(
        CancellationToken cancellationToken = default)
    {
        var items = await rules.GetAllRulesAsync(cancellationToken);
        return CatalogServiceResult.Success<IReadOnlyList<DietRuleDto>>(
            items.Select(ToRuleDto).ToList());
    }

    public async Task<CatalogServiceResult<DietRuleDto>> GetAsync(
        Guid id,
        bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var rule = await rules.FindRuleAsync(id, includeInactive, cancellationToken: cancellationToken);
        if (rule is null)
        {
            return CatalogServiceResult.Failure<DietRuleDto>(
                "rule_not_found",
                "Diet rule was not found.");
        }

        if (!includeInactive)
        {
            rule.Versions = rule.Versions
                .Where(x => x.State == RuleVersionState.Published)
                .OrderBy(x => x.VersionNumber)
                .ToList();
        }

        return CatalogServiceResult.Success(ToRuleDto(rule));
    }

    public async Task<CatalogServiceResult<DietRuleDto>> CreateRuleAsync(
        CreateDietRuleCommand command,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(command.RuleKey) ||
            string.IsNullOrWhiteSpace(command.Title) ||
            string.IsNullOrWhiteSpace(command.Description) ||
            string.IsNullOrWhiteSpace(command.Category))
        {
            return CatalogServiceResult.Failure<DietRuleDto>(
                "invalid_rule",
                "Rule key, title, description and category are required.");
        }

        var now = timeProvider.GetUtcNow();
        var rule = new DietRule
        {
            RuleKey = command.RuleKey.Trim().ToUpperInvariant(),
            Title = command.Title.Trim(),
            Description = command.Description.Trim(),
            Category = command.Category.Trim(),
            IsMedicalSensitive = command.IsMedicalSensitive,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now,
        };

        await rules.AddRuleAsync(rule, cancellationToken);
        await rules.SaveChangesAsync(cancellationToken);
        return CatalogServiceResult.Success(ToRuleDto(rule));
    }

    public async Task<CatalogServiceResult<DietRuleDto>> UpdateRuleAsync(
        Guid ruleId,
        CreateDietRuleCommand command,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(command.RuleKey) ||
            string.IsNullOrWhiteSpace(command.Title) ||
            string.IsNullOrWhiteSpace(command.Description) ||
            string.IsNullOrWhiteSpace(command.Category))
        {
            return CatalogServiceResult.Failure<DietRuleDto>(
                "invalid_rule",
                "Rule key, title, description and category are required.");
        }

        var rule = await rules.FindRuleAsync(ruleId, includeInactive: true, trackChanges: true, cancellationToken: cancellationToken);
        if (rule is null)
        {
            return CatalogServiceResult.Failure<DietRuleDto>(
                "rule_not_found",
                "Diet rule was not found.");
        }

        if (rule.Versions.Any(v => v.State is RuleVersionState.Published or RuleVersionState.Retired))
        {
            return CatalogServiceResult.Failure<DietRuleDto>("published_rule_immutable", "Rule metadata referenced by published history cannot be modified.");
        }

        rule.RuleKey = command.RuleKey.Trim().ToUpperInvariant();
        rule.Title = command.Title.Trim();
        rule.Description = command.Description.Trim();
        rule.Category = command.Category.Trim();
        rule.IsMedicalSensitive = command.IsMedicalSensitive;
        rule.UpdatedAt = timeProvider.GetUtcNow();

        await rules.SaveChangesAsync(cancellationToken);
        return CatalogServiceResult.Success(ToRuleDto(rule));
    }

    public async Task<CatalogServiceResult<RuleVersionDto>> CreateVersionAsync(
        Guid ruleId,
        CreateRuleVersionCommand command,
        Guid actorId,
        CancellationToken cancellationToken = default)
    {
        var rule = await rules.FindRuleAsync(
            ruleId,
            includeInactive: true,
            cancellationToken: cancellationToken);

        if (rule is null)
        {
            return CatalogServiceResult.Failure<RuleVersionDto>(
                "rule_not_found",
                "Diet rule was not found.");
        }

        var validation = ValidateVersion(command.ParametersJson, command.SourceUrl, command.Citation, command.SourceType, command.EvidenceLevel);
        if (validation is not null)
        {
            return CatalogServiceResult.Failure<RuleVersionDto>(
                validation.Value.Code,
                validation.Value.Message);
        }

        var version = new RuleVersion
        {
            DietRuleId = rule.Id,
            VersionNumber = rule.Versions.Count == 0
                ? 1
                : rule.Versions.Max(x => x.VersionNumber) + 1,
            ParametersJson = command.ParametersJson.Trim(),
            SourceUrl = command.SourceUrl.Trim(),
            SourceType = command.SourceType,
            Citation = command.Citation.Trim(),
            EvidenceLevel = command.EvidenceLevel,
            State = RuleVersionState.Draft,
            EffectiveAt = command.EffectiveAt,
            CreatedAt = timeProvider.GetUtcNow(),
        };

        await rules.AddVersionAsync(version, cancellationToken);
        await AppendAuditAsync(version, actorId, "Created", "Draft created", cancellationToken);
        await rules.SaveChangesAsync(cancellationToken);
        return CatalogServiceResult.Success(ToVersionDto(version));
    }

    public async Task<CatalogServiceResult<RuleVersionDto>> UpdateVersionAsync(
        Guid versionId,
        UpdateRuleVersionCommand command,
        Guid actorId,
        CancellationToken cancellationToken = default)
    {
        var version = await rules.FindVersionAsync(versionId, cancellationToken);
        if (version is null)
        {
            return CatalogServiceResult.Failure<RuleVersionDto>(
                "rule_version_not_found",
                "Rule version was not found.");
        }

        if (version.State != RuleVersionState.Draft)
        {
            return CatalogServiceResult.Failure<RuleVersionDto>(
                "published_rule_immutable",
                "Only draft rule versions can be modified.");
        }

        var validation = ValidateVersion(command.ParametersJson, command.SourceUrl, command.Citation, command.SourceType, command.EvidenceLevel);
        if (validation is not null)
        {
            return CatalogServiceResult.Failure<RuleVersionDto>(
                validation.Value.Code,
                validation.Value.Message);
        }

        version.ParametersJson = command.ParametersJson.Trim();
        version.SourceUrl = command.SourceUrl.Trim();
        version.SourceType = command.SourceType;
        version.Citation = command.Citation.Trim();
        version.EvidenceLevel = command.EvidenceLevel;
        version.EffectiveAt = command.EffectiveAt;
        version.Revision = Guid.NewGuid();
        await AppendAuditAsync(version, actorId, "Edited", "Draft content updated", cancellationToken);
        if (!await TrySaveAsync(cancellationToken))
        {
            return CatalogServiceResult.Failure<RuleVersionDto>("rule_version_conflict", "Version changed; reload before retrying.");
        }
        return CatalogServiceResult.Success(ToVersionDto(version));
    }

    public Task<CatalogServiceResult<RuleVersionDto>> SubmitForReviewAsync(Guid versionId, Guid actorId, CancellationToken cancellationToken = default) =>
        TransitionAsync(versionId, RuleVersionState.Draft, RuleVersionState.InReview, actorId, "Submitted", "Submitted for review", cancellationToken);

    public Task<CatalogServiceResult<RuleVersionDto>> RejectVersionAsync(Guid versionId, Guid actorId, CancellationToken cancellationToken = default) =>
        TransitionAsync(versionId, RuleVersionState.InReview, RuleVersionState.Draft, actorId, "Rejected", "Returned to draft for changes", cancellationToken);

    public Task<CatalogServiceResult<RuleVersionDto>> PublishVersionAsync(Guid versionId, Guid actorId, CancellationToken cancellationToken = default) =>
        TransitionAsync(versionId, RuleVersionState.InReview, RuleVersionState.Published, actorId, "Published", "Review approved for publication", cancellationToken);

    public Task<CatalogServiceResult<RuleVersionDto>> RetireVersionAsync(Guid versionId, Guid actorId, CancellationToken cancellationToken = default) =>
        TransitionAsync(versionId, RuleVersionState.Published, RuleVersionState.Retired, actorId, "Retired", "Retired; historical references retained", cancellationToken);

    public async Task<CatalogServiceResult<PagedResult<RuleReviewQueueItemDto>>> GetReviewQueueAsync(
        int page, int pageSize, bool? medicalSensitive, CancellationToken cancellationToken = default)
    {
        if (page is < 1 or > 100000 || pageSize is < 1 or > 100)
            return CatalogServiceResult.Failure<PagedResult<RuleReviewQueueItemDto>>(
                "invalid_page", "Use page 1-100000 and pageSize 1-100.");

        var rows = await rules.GetReviewQueueAsync(page, pageSize, medicalSensitive, cancellationToken);
        var items = rows.Items.Select(x => new RuleReviewQueueItemDto(
            x.Id, x.DietRuleId, x.DietRule.RuleKey, x.DietRule.Title,
            x.VersionNumber, x.DietRule.IsMedicalSensitive, x.State,
            x.SourceUrl, x.Citation, x.EvidenceLevel, x.CreatedAt)).ToArray();
        return CatalogServiceResult.Success(PagedResultFactory.Create(
            items, page, pageSize, rows.TotalItems));
    }

    public async Task<CatalogServiceResult<RuleImpactDto>> GetVersionImpactAsync(
        Guid versionId, CancellationToken cancellationToken = default)
    {
        var version = await rules.FindVersionAsync(versionId, cancellationToken);
        if (version is null)
            return CatalogServiceResult.Failure<RuleImpactDto>(
                "rule_version_not_found", "Rule version was not found.");
        var usage = await rules.GetRuleSetUsageAsync(versionId, cancellationToken);
        var items = usage.Select(x => new RuleSetPlanUsageDto(
            x.RuleSetVersion, x.IsActiveRuleSet, x.TotalPlans,
            x.ActivePlans, x.DistinctUsers)).ToArray();
        return CatalogServiceResult.Success(new RuleImpactDto(
            versionId, items.Length, items.Sum(x => x.TotalPlans),
            items.Sum(x => x.ActivePlans), items));
    }

    public async Task<CatalogServiceResult<PagedResult<RuleAuditDto>>> GetHistoryAsync(Guid versionId, int page, int pageSize, string? search = null, string? action = null, CancellationToken cancellationToken = default)
    {
        if (page < 1 || page > 100000 || pageSize < 1 || pageSize > 100)
        {
            return CatalogServiceResult.Failure<PagedResult<RuleAuditDto>>("invalid_page", "Use page 1-100000 and pageSize 1-100.");
        }

        if (await rules.FindVersionAsync(versionId, cancellationToken) is null)
        {
            return CatalogServiceResult.Failure<PagedResult<RuleAuditDto>>("rule_version_not_found", "Rule version was not found.");
        }

        if (search?.Length > 200 || (action is not null && action is not ("Created" or "Edited" or "Submitted" or "Rejected" or "Published" or "Retired")))
        {
            return CatalogServiceResult.Failure<PagedResult<RuleAuditDto>>("invalid_filter", "Use a supported action and search up to 200 characters.");
        }

        var history = await rules.GetHistoryAsync(versionId, page, pageSize, search, action, cancellationToken);
        var items = history.Items.Select(x => new RuleAuditDto(x.Id, x.RuleVersionId, x.VersionNumber, x.ActorId, x.OccurredAt, x.Action, x.Details)).ToList();
        return CatalogServiceResult.Success(PagedResultFactory.Create(items, page, pageSize, history.TotalItems));
    }

    private async Task<CatalogServiceResult<RuleVersionDto>> TransitionAsync(Guid versionId, RuleVersionState expected, RuleVersionState next,
        Guid actorId, string action, string details, CancellationToken cancellationToken)
    {
        var version = await rules.FindVersionAsync(versionId, cancellationToken);
        if (version is null)
        {
            return CatalogServiceResult.Failure<RuleVersionDto>("rule_version_not_found", "Rule version was not found.");
        }

        if (version.State != expected)
        {
            return CatalogServiceResult.Failure<RuleVersionDto>("rule_version_conflict", $"Transition requires {expected}; current state is {version.State}.");
        }

        if (next is RuleVersionState.InReview or RuleVersionState.Published)
        {
            var validation = ValidateVersion(version.ParametersJson, version.SourceUrl, version.Citation, version.SourceType, version.EvidenceLevel);
            if (validation is not null)
            {
                return CatalogServiceResult.Failure<RuleVersionDto>(validation.Value.Code, validation.Value.Message);
            }
        }

        // Publication is an independently reviewed safety-critical operation.
        // The last submitted audit is the authoritative reviewer boundary.
        if (next == RuleVersionState.Published)
        {
            var submissions = await rules.GetHistoryAsync(
                versionId, page: 1, pageSize: 1,
                search: null, action: "Submitted", cancellationToken: cancellationToken);
            var submitted = submissions.Items.Count > 0 ? submissions.Items[0] : null;
            if (submitted is null || submitted.ActorId == actorId)
                return CatalogServiceResult.Failure<RuleVersionDto>(
                    "independent_review_required",
                    "A different administrator must approve this version after submission.");
        }

        version.State = next;
        version.Revision = Guid.NewGuid();
        if (next == RuleVersionState.Published)
        {
            version.PublishedAt = timeProvider.GetUtcNow();
            version.EffectiveAt ??= version.PublishedAt;
        }

        await AppendAuditAsync(version, actorId, action, details, cancellationToken);
        if (!await TrySaveAsync(cancellationToken))
        {
            return CatalogServiceResult.Failure<RuleVersionDto>("rule_version_conflict", "Version changed; reload before retrying.");
        }

        return CatalogServiceResult.Success(ToVersionDto(version));
    }

    private Task AppendAuditAsync(RuleVersion version, Guid actorId, string action, string details, CancellationToken cancellationToken) =>
        rules.AddAuditAsync(new RuleAudit
        {
            RuleVersionId = version.Id, VersionNumber = version.VersionNumber, ActorId = actorId,
            OccurredAt = timeProvider.GetUtcNow(), Action = action, Details = details,
        }, cancellationToken);

    private async Task<bool> TrySaveAsync(CancellationToken cancellationToken)
    {
        try
        {
            await rules.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (DbUpdateConcurrencyException)
        {
            return false;
        }
    }

    public async Task<CatalogServiceResult<RuleSetDto>> GetActiveRuleSetAsync(
        CancellationToken cancellationToken = default)
    {
        var ruleSet = await rules.GetActiveRuleSetAsync(cancellationToken);
        return ruleSet is null
            ? CatalogServiceResult.Failure<RuleSetDto>(
                "active_rule_set_not_found",
                "No active rule set is available.")
            : CatalogServiceResult.Success(ToRuleSetDto(ruleSet));
    }

    private static (string Code, string Message)? ValidateVersion(
        string parametersJson,
        string sourceUrl,
        string citation, SourceType sourceType, EvidenceLevel evidenceLevel)
    {
        if (string.IsNullOrWhiteSpace(parametersJson))
        {
            return ("invalid_parameters", "Rule parameters are required.");
        }

        if (string.IsNullOrWhiteSpace(sourceUrl) || string.IsNullOrWhiteSpace(citation))
        {
            return ("missing_provenance", "A source URL and citation are required.");
        }

        if (!Uri.TryCreate(sourceUrl, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp))
        {
            return ("invalid_source_url", "Source URL must be an absolute HTTP or HTTPS URL.");
        }

        if (!Enum.IsDefined(sourceType) || !Enum.IsDefined(evidenceLevel) || sourceUrl.Length > 1000 || citation.Length > 1000)
        {
            return ("invalid_provenance", "Valid source type, evidence level and provenance up to 1000 characters are required.");
        }

        if (parametersJson.Length > 16000)
        {
            return ("invalid_parameters", "Rule parameters must not exceed 16000 characters.");
        }

        try
        {
            using var document = JsonDocument.Parse(parametersJson, new JsonDocumentOptions { MaxDepth = 16 });
            if (document.RootElement.ValueKind != JsonValueKind.Object || HasDuplicateProperties(document.RootElement))
            {
                return ("invalid_parameters", "Rule parameters must be a JSON object with unique property names.");
            }
        }
        catch (JsonException)
        {
            return ("invalid_parameters", "Rule parameters must be valid JSON.");
        }

        return null;
    }

    private static bool HasDuplicateProperties(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            var names = new HashSet<string>(StringComparer.Ordinal);
            return element.EnumerateObject().Any(p => !names.Add(p.Name) || HasDuplicateProperties(p.Value));
        }

        return element.ValueKind == JsonValueKind.Array && element.EnumerateArray().Any(HasDuplicateProperties);
    }

    private static DietRuleDto ToRuleDto(DietRule rule) =>
        new(
            rule.Id,
            rule.RuleKey,
            rule.Title,
            rule.Description,
            rule.Category,
            rule.IsMedicalSensitive,
            rule.IsActive,
            rule.Versions
                .OrderBy(x => x.VersionNumber)
                .Select(ToVersionDto)
                .ToList());

    private static RuleVersionDto ToVersionDto(RuleVersion version) =>
        new(
            version.Id,
            version.DietRuleId,
            version.VersionNumber,
            version.ParametersJson,
            version.SourceUrl,
            version.SourceType,
            version.Citation,
            version.EvidenceLevel,
            version.State,
            version.EffectiveAt,
            version.PublishedAt);

    private static RuleSetDto ToRuleSetDto(RuleSetVersion ruleSet) =>
        new(
            ruleSet.Id,
            ruleSet.VersionLabel,
            ruleSet.IsActive,
            ruleSet.EffectiveAt,
            ruleSet.PublishedAt,
            ruleSet.RuleVersions
                .Where(x => x.State == RuleVersionState.Published)
                .OrderBy(x => x.DietRule.RuleKey)
                .ThenBy(x => x.VersionNumber)
                .Select(ToVersionDto)
                .ToList());
}
