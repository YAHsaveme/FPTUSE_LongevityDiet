namespace LongevityDiet.Services.Querying;

/// <summary>Query contract for an authenticated, bounded server-side history listing.</summary>
public sealed record CollectionPageQuery(
    int Page = 1,
    int PageSize = 20,
    string? Search = null,
    DateOnly? FromDate = null,
    DateOnly? ToDate = null,
    string? Status = null,
    string SortBy = "weekStart",
    string SortDirection = "desc",
    string? SlotType = null)
{
    public string? Validate(IReadOnlySet<string> supportedSortFields, IReadOnlySet<string>? supportedStatuses = null)
    {
        if (Page is < 1 or > 100000 || PageSize is < 1 or > 100)
            return "Page must be 1-100000 and pageSize must be 1-100.";
        if (Search?.Length > 120)
            return "Search cannot exceed 120 characters.";
        if (FromDate > ToDate)
            return "fromDate must be before or equal to toDate.";
        if (!supportedSortFields.Contains(SortBy))
            return "Unsupported sortBy field.";
        if (SortDirection is not ("asc" or "desc"))
            return "sortDirection must be asc or desc.";
        if (!string.IsNullOrWhiteSpace(Status) &&
            (supportedStatuses is null || !supportedStatuses.Contains(Status)))
            return "Unsupported status filter.";
        return null;
    }
}

public sealed record CollectionPage<T>(
    IReadOnlyList<T> Items, int Page, int PageSize, int TotalItems, int TotalPages);

public static class CollectionPageFactory
{
    public static CollectionPage<T> Create<T>(IReadOnlyList<T> items, int page, int pageSize, int total) =>
        new(items, page, pageSize, total, (total + pageSize - 1) / pageSize);
}
