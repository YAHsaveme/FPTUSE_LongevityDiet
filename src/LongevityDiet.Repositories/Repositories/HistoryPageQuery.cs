namespace LongevityDiet.Repositories.Repositories;

public sealed record HistoryPageQuery(
    int Page,
    int PageSize,
    string? Search,
    DateOnly? FromDate,
    DateOnly? ToDate,
    string? Status,
    string SortBy,
    bool Descending,
    string? SlotType = null);

public sealed record PagedRepositoryItems<T>(IReadOnlyList<T> Items, int TotalItems);
