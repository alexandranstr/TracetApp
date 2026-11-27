using Microsoft.EntityFrameworkCore;
using Tracet.Application.Abstractions;
using Tracet.Domain.Entities;

namespace Tracet.Application.Recommendations;

public sealed record Recommendation(
    int Id,
    double Latitude,
    double Longitude,
    string Title,
    string Category,
    string Description,
    double MatchScore,
    IReadOnlyList<string> MatchedTags,
    IReadOnlyList<int> TagIds);

public interface IRecommendationService
{
    Task<IReadOnlyList<Recommendation>> GetForUserAsync(string userId, CancellationToken cancellationToken = default);
}

public sealed class RecommendationService(IAppDbContext db) : IRecommendationService
{
    private const int MaxRecommendations = 5;
    private const string DefaultCategory = "Travel Spot";

    public async Task<IReadOnlyList<Recommendation>> GetForUserAsync(string userId, CancellationToken cancellationToken = default)
    {
        var tagNames = await db.Tags.ToDictionaryAsync(t => t.Id, t => t.Name, cancellationToken);
        var userPins = await db.Pins.Where(p => p.UserId == userId).ToListAsync(cancellationToken);
        var userTagCounts = RecommendationScorer.CountTagOccurrences(userPins.Select(p => p.TagsVectorJson), tagNames.Keys);
        var visitedLocationIds = userPins.Select(p => p.LocationId).ToHashSet();

        var candidates = await db.Locations
            .Where(l => !visitedLocationIds.Contains(l.Id))
            .Include(l => l.LocationTags)
            .ToListAsync(cancellationToken);

        var candidateIds = candidates.Select(l => l.Id).ToList();
        var pinTagCounts = (await db.Pins
                .Where(p => candidateIds.Contains(p.LocationId))
                .Select(p => new { p.LocationId, p.TagsVectorJson })
                .ToListAsync(cancellationToken))
            .GroupBy(p => p.LocationId)
            .ToDictionary(
                g => g.Key,
                g => RecommendationScorer.CountTagOccurrences(g.Select(p => p.TagsVectorJson), tagNames.Keys));

        return candidates
            .Select(location => Score(location, pinTagCounts.GetValueOrDefault(location.Id) ?? SeededTagCounts(location, tagNames), userTagCounts, tagNames))
            .OrderByDescending(r => r.MatchScore)
            .ThenByDescending(r => r.TagIds.Count)
            .ThenByDescending(r => r.MatchedTags.Count)
            .Take(MaxRecommendations)
            .ToList();
    }

    private static Recommendation Score(
        Location location,
        IReadOnlyDictionary<int, int> locationTagCounts,
        IReadOnlyDictionary<int, int> userTagCounts,
        IReadOnlyDictionary<int, string> tagNames)
    {
        var tags = locationTagCounts
            .Where(t => t.Value > 0 && tagNames.ContainsKey(t.Key))
            .OrderByDescending(t => t.Value)
            .ThenBy(t => t.Key)
            .Select(t => t.Key)
            .ToList();
        var score = Math.Round(RecommendationScorer.CalculateCosineMatchScore(userTagCounts, locationTagCounts), 1);

        return new Recommendation(
            location.Id,
            location.Latitude,
            location.Longitude,
            location.DisplayName,
            tags.Count > 0 ? tagNames[tags[0]] : DefaultCategory,
            Describe(score),
            score,
            tags.Where(userTagCounts.ContainsKey).Select(id => tagNames[id]).ToList(),
            tags);
    }

    private static Dictionary<int, int> SeededTagCounts(Location location, IReadOnlyDictionary<int, string> tagNames) =>
        location.LocationTags
            .Where(lt => lt.TagCount > 0 && tagNames.ContainsKey(lt.TagId))
            .ToDictionary(lt => lt.TagId, lt => lt.TagCount);

    private static string Describe(double score) => score switch
    {
        > 70 => "This place is a strong match for the tags you use most.",
        > 40 => "This place shares several of your most-used tags.",
        > 0 => "This place has some tag overlap with your saved places.",
        _ => "Explore this place as a new suggestion."
    };
}
