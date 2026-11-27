using Microsoft.EntityFrameworkCore;

namespace Tracet.Application.Common;

public sealed record PageRequest(int Page, int PageSize)
{
    public static PageRequest Create(int page, int pageSize, int maxPageSize) =>
        new(Math.Max(1, page), Math.Clamp(pageSize, 1, maxPageSize));

    public int Skip => (Page - 1) * PageSize;
}

public sealed record Pagination(
    int CurrentPage,
    int PageSize,
    int TotalItems,
    int TotalPages,
    bool HasPreviousPage,
    bool HasNextPage)
{
    public static Pagination Create(PageRequest request, int totalItems)
    {
        var totalPages = (int)Math.Ceiling((double)totalItems / request.PageSize);
        return new Pagination(
            request.Page,
            request.PageSize,
            totalItems,
            totalPages,
            request.Page > 1,
            request.Page < totalPages);
    }
}

public static class PagingExtensions
{
    public static IQueryable<T> Page<T>(this IQueryable<T> query, PageRequest request) =>
        query.Skip(request.Skip).Take(request.PageSize);

    public static IEnumerable<T> Page<T>(this IEnumerable<T> items, PageRequest request) =>
        items.Skip(request.Skip).Take(request.PageSize);

    public static async Task<(List<T> Items, Pagination Pagination)> ToPageAsync<T>(
        this IQueryable<T> query, PageRequest request, CancellationToken cancellationToken = default)
    {
        var total = await query.CountAsync(cancellationToken);
        var items = await query.Page(request).ToListAsync(cancellationToken);
        return (items, Pagination.Create(request, total));
    }
}
