using Tracet.services;
using Xunit;

namespace Tracet.Tests;

public class RecommendationScorerTests
{
    [Fact]
    public void CalculateCosineMatchScore_ReturnsExpectedScoreForExampleVectors()
    {
        var userTagCounts = new Dictionary<int, int>
        {
            [1] = 4,
            [2] = 2,
            [3] = 1,
            [5] = 1
        };
        var locationTagCounts = new Dictionary<int, int>
        {
            [1] = 3,
            [2] = 1,
            [4] = 2,
            [5] = 2
        };

        var score = RecommendationScorer.CalculateCosineMatchScore(userTagCounts, locationTagCounts);

        Assert.Equal(80.4, score, 1);
    }

    [Fact]
    public void CalculateCosineMatchScore_ReturnsZeroWhenVectorsHaveNoOverlap()
    {
        var score = RecommendationScorer.CalculateCosineMatchScore(
            new Dictionary<int, int> { [1] = 3 },
            new Dictionary<int, int> { [2] = 5 });

        Assert.Equal(0, score);
    }

    [Fact]
    public void CalculateCosineMatchScore_ReturnsOneHundredForProportionalVectors()
    {
        var score = RecommendationScorer.CalculateCosineMatchScore(
            new Dictionary<int, int> { [1] = 4, [2] = 1 },
            new Dictionary<int, int> { [1] = 8, [2] = 2 });

        Assert.Equal(100, score, 10);
    }

    [Fact]
    public void CalculateCosineMatchScore_ReturnsZeroWhenEitherVectorIsEmpty()
    {
        var score = RecommendationScorer.CalculateCosineMatchScore(
            new Dictionary<int, int>(),
            new Dictionary<int, int> { [1] = 2 });

        Assert.Equal(0, score);
    }

    [Fact]
    public void CountTagOccurrencesCountsEachTagOncePerPinAndIgnoresInvalidInput()
    {
        var counts = RecommendationScorer.CountTagOccurrences(
            ["[1, 1, 2]", "[1, 2]", "not-json", "[3]", "null"],
            [1, 2]);

        Assert.Equal(2, counts[1]);
        Assert.Equal(2, counts[2]);
        Assert.Equal(2, counts.Count);
    }
}