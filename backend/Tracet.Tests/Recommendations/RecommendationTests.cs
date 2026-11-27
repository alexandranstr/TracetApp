using System.Net;
using Tracet.Tests.Infrastructure;
using Xunit;

namespace Tracet.Tests.Recommendations;

public class RecommendationTests : IClassFixture<TracetApiFactory>
{
    private const string UncommonTags = "[1,4,6,12]";

    private readonly TracetApiFactory _api;

    public RecommendationTests(TracetApiFactory api) => _api = api;

    [Fact]
    public async Task Tags_are_listed_in_order_and_require_login()
    {
        var anonymous = await _api.AnonymousClient().GetAsync("/api/tags");
        var tags = await _api.ClientFor(await _api.CreateUserAsync("tagger")).GetJsonAsync("/api/tags");

        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        Assert.Equal(12, tags.GetArrayLength());
        Assert.Equal(1, tags[0].GetProperty("id").GetInt32());
        Assert.Equal("Nightlife", tags[0].GetProperty("name").GetString());
    }

    [Fact]
    public async Task Best_match_is_a_place_with_the_same_tags_that_the_user_has_not_visited()
    {
        var traveller = _api.ClientFor(await _api.CreateUserAsync("traveller"));
        var local = _api.ClientFor(await _api.CreateUserAsync("local"));
        var visited = await traveller.CreatePinAsync(PinTestData.NewPin(title: "Visited", tagsVectorJson: UncommonTags));
        var suggested = await local.CreatePinAsync(PinTestData.NewPin(title: "Hidden spot", city: "Sibiu", tagsVectorJson: UncommonTags));

        var recommendations = await traveller.GetJsonAsync("/api/tags/recommendations");

        var visitedLocation = visited.GetProperty("location").GetProperty("id").GetInt32();
        var best = recommendations[0];
        Assert.InRange(recommendations.GetArrayLength(), 1, 5);
        Assert.DoesNotContain(visitedLocation, recommendations.EnumerateArray().Select(r => r.GetProperty("id").GetInt32()));
        Assert.Equal(suggested.GetProperty("location").GetProperty("id").GetInt32(), best.GetProperty("id").GetInt32());
        Assert.Equal(100, best.GetProperty("matchScore").GetDouble());
        Assert.Equal("Hidden spot, Sibiu, Romania", best.GetProperty("title").GetString());
        Assert.Equal(4, best.GetProperty("matchedTags").GetArrayLength());
        Assert.Equal("This place is a strong match for the tags you use most.", best.GetProperty("description").GetString());
    }

    [Fact]
    public async Task New_user_still_gets_suggestions()
    {
        var newcomer = _api.ClientFor(await _api.CreateUserAsync("newcomer"));

        var recommendations = await newcomer.GetJsonAsync("/api/tags/recommendations");

        Assert.InRange(recommendations.GetArrayLength(), 1, 5);
        Assert.All(recommendations.EnumerateArray(), r => Assert.Equal(0, r.GetProperty("matchScore").GetDouble()));
    }
}
