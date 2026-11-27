using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Tracet.Application.Abstractions;
using Tracet.Application.Tags;
using Tracet.Domain.Entities;

namespace Tracet.Application.Pins.Statistics;

public sealed class PinStatisticsService(IAppDbContext db, IMemoryCache cache) : IPinStatisticsService
{
    private const int TopCount = 5;
    private const int MonthsShown = 12;

    private static readonly MemoryCacheEntryOptions CacheOptions = new MemoryCacheEntryOptions()
        .SetSlidingExpiration(TimeSpan.FromMinutes(5))
        .SetAbsoluteExpiration(TimeSpan.FromMinutes(30));

    public async Task<PinStatistics> GetAsync(string userId, CancellationToken cancellationToken = default)
    {
        if (cache.TryGetValue(CacheKey(userId), out PinStatistics? cached) && cached is not null)
            return cached;

        var pins = await db.Pins
            .Include(p => p.Location)
            .Where(p => p.UserId == userId)
            .ToListAsync(cancellationToken);

        var statistics = await BuildAsync(pins, cancellationToken);
        cache.Set(CacheKey(userId), statistics, CacheOptions);
        return statistics;
    }

    public void Invalidate(string userId) => cache.Remove(CacheKey(userId));

    private async Task<PinStatistics> BuildAsync(List<Pin> pins, CancellationToken cancellationToken)
    {
        var countries = CountBy(pins, p => p.Location.CountryName);
        var cities = CountBy(pins, p => p.Location.CityName);
        var ratings = pins.Where(p => p.Rating.HasValue).Select(p => p.Rating!.Value).ToList();

        return new PinStatistics(
            pins.Count,
            ratings.Count > 0 ? Math.Round(ratings.Average(), 1) : 0.0,
            countries.Count,
            cities.Count,
            countries.Take(TopCount).Select(c => new CountryCount(c.Key, c.Count)).ToList(),
            cities.Take(TopCount).Select(c => new CityCount(c.Key, c.Count)).ToList(),
            CountBy(pins, p => p.Category).Take(TopCount).Select(c => new CategoryCount(c.Key, c.Count)).ToList(),
            await TopTagsAsync(pins, cancellationToken),
            PinsByMonth(pins));
    }

    private static List<(string Key, int Count)> CountBy(IEnumerable<Pin> pins, Func<Pin, string?> key) =>
        pins.Select(key)
            .Where(value => !string.IsNullOrEmpty(value))
            .GroupBy(value => value!)
            .Select(g => (g.Key, g.Count()))
            .OrderByDescending(g => g.Item2)
            .ToList();

    private async Task<IReadOnlyList<TagCount>> TopTagsAsync(IEnumerable<Pin> pins, CancellationToken cancellationToken)
    {
        var topTags = pins
            .SelectMany(p => TagVector.Parse(p.TagsVectorJson))
            .GroupBy(id => id)
            .Select(g => (TagId: g.Key, Count: g.Count()))
            .OrderByDescending(t => t.Count)
            .Take(TopCount)
            .ToList();
        if (topTags.Count == 0) return [];

        var tagIds = topTags.Select(t => t.TagId).ToList();
        var names = await db.Tags
            .Where(t => tagIds.Contains(t.Id))
            .ToDictionaryAsync(t => t.Id, t => t.Name, cancellationToken);

        return topTags
            .Select(t => new TagCount(names.GetValueOrDefault(t.TagId, $"Tag {t.TagId}"), t.Count))
            .ToList();
    }

    private static IReadOnlyList<MonthCount> PinsByMonth(IReadOnlyCollection<Pin> pins)
    {
        var now = DateTime.UtcNow;
        return Enumerable.Range(0, MonthsShown)
            .Select(offset => now.AddMonths(offset - (MonthsShown - 1)))
            .Select(month => new MonthCount(
                month.Month,
                month.Year,
                pins.Count(p => p.CreatedAt.Year == month.Year && p.CreatedAt.Month == month.Month)))
            .ToList();
    }

    private static string CacheKey(string userId) => $"statistics_{userId}";
}
