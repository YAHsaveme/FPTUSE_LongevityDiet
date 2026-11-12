namespace LongevityDiet.Domain.Catalog.Entities;

// Safe metadata only: never copy request bodies, credentials or questionnaire answers.
public sealed class RuleAudit
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RuleVersionId { get; set; }
    public int VersionNumber { get; set; }
    public Guid ActorId { get; set; }
    public DateTimeOffset OccurredAt { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
}
