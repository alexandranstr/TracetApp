using System.Text.Json;

namespace Tracet.services;

public static class RecommendationScorer
{
    public static Dictionary<int, int> CountTagOccurrences(
        IEnumerable<string?> tagVectors,
        IEnumerable<int>? validTagIds = null)
    {
        var validIds = validTagIds?.ToHashSet();
        var tagCounts = new Dictionary<int, int>();

        foreach (var tagVector in tagVectors)
        {
            if (string.IsNullOrWhiteSpace(tagVector)) continue;

            try
            {
                var tagIds = JsonSerializer.Deserialize<HashSet<int>>(tagVector);
                if (tagIds == null) continue;

                foreach (var tagId in tagIds)
                {
                    if (tagId <= 0 || (validIds != null && !validIds.Contains(tagId))) continue;
                    tagCounts[tagId] = tagCounts.GetValueOrDefault(tagId) + 1;
                }
            }
            catch (JsonException)
            {
            }
        }

        return tagCounts;
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