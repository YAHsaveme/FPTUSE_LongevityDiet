namespace LongevityDiet.Services.Planning;

/// <summary>
/// An administrative data/configuration prerequisite is missing or unusable.
/// Distinct from unsafe user-provided restrictions and infrastructure faults.
/// Never includes raw database or provider errors.
/// </summary>
public sealed class PlanningCatalogUnavailableException(string code, string message)
    : InvalidOperationException(message)
{
    public string Code { get; } = code;
}
