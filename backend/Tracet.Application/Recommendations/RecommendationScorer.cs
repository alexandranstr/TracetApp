using Tracet.Application.Tags;

namespace Tracet.Application.Recommendations;

public static class RecommendationScorer
{
    public static Dictionary<int, int> CountTagOccurrences(
        IEnumerable<string?> tagVectors,
        IEnumerable<int>? validTagIds = null)
    {
        var validIds = validTagIds?.ToHashSet();
        return tagVectors
            .SelectMany(vector => TagVector.Parse(vector).Distinct())
            .Where(tagId => tagId > 0 && (validIds is null || validIds.Contains(tagId)))
            .GroupBy(tagId => tagId)
            .ToDictionary(group => group.Key, group => group.Count());
    }

    public static double CalculateCosineMatchScore(
        IReadOnlyDictionary<int, int> userTagCounts,
        IReadOnlyDictionary<int, int> locationTagCounts)
    {
        var userWeights = Normalize(userTagCounts);
        var locationWeights = Normalize(locationTagCounts);
        if (userWeights.Norm == 0 || locationWeights.Norm == 0) return 0;

        var dotProduct = userWeights.Weights.Sum(pair =>
            pair.Value * locationWeights.Weights.GetValueOrDefault(pair.Key));
        var score = dotProduct / (userWeights.Norm * locationWeights.Norm) * 100;

        return Math.Clamp(score, 0, 100);
    }

    private static (Dictionary<int, double> Weights, double Norm) Normalize(
        IReadOnlyDictionary<int, int> tagCounts)
    {
        var positiveCounts = tagCounts
            .Where(pair => pair.Value > 0)
            .ToList();
        var total = positiveCounts.Sum(pair => (double)pair.Value);
        if (total == 0) return (new Dictionary<int, double>(), 0);

        var weights = positiveCounts.ToDictionary(pair => pair.Key, pair => pair.Value / total);
        var norm = Math.Sqrt(weights.Values.Sum(weight => weight * weight));

        return (weights, norm);
    }
}