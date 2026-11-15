namespace LongevityDiet.Domain.Catalog.Entities;

// One immutable snapshot per create/update/archive event. Earlier nutritional
// values and associations survive edits and soft removals of current links.
public sealed class RecipeCompositionRevision
{
    // EF generates the key when this new revision is attached to a tracked recipe.
    public Guid Id { get; set; }
    public Guid RecipeId { get; set; }
    public DateTime RecordedAt { get; set; }
    public string ChangeType { get; set; } = string.Empty;
    public Guid? ActorId { get; set; }
    public string SnapshotJson { get; set; } = string.Empty;
    public Recipe Recipe { get; set; } = null!;
}
