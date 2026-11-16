namespace LongevityDiet.Domain.Entities;

/// <summary>Append-only administrative status changes. Never stores health data or credentials.</summary>
public sealed class MemberAccountAudit
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MemberId { get; set; }
    public Guid ActorAdminId { get; set; }
    public AccountStatus PreviousStatus { get; set; }
    public AccountStatus NewStatus { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTimeOffset ChangedAt { get; set; } = DateTimeOffset.UtcNow;
}
