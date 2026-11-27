using Microsoft.EntityFrameworkCore;
using Tracet.Application.Abstractions;

namespace Tracet.Application.Tags;

public sealed record TagItem(int Id, string Name);

public interface ITagService
{
    Task<IReadOnlyList<TagItem>> GetAllAsync(CancellationToken cancellationToken = default);
}

public sealed class TagService(IAppDbContext db) : ITagService
{
    public async Task<IReadOnlyList<TagItem>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await db.Tags
            .OrderBy(t => t.Id)
            .Select(t => new TagItem(t.Id, t.Name))
            .ToListAsync(cancellationToken);
}
