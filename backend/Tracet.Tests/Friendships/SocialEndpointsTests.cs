using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Tracet.Tests.Infrastructure;
using Xunit;

namespace Tracet.Tests.Friendships;

public class SocialEndpointsTests : IClassFixture<TracetApiFactory>
{
    private readonly TracetApiFactory _api;

    public SocialEndpointsTests(TracetApiFactory api) => _api = api;

    private static async Task<JsonElement> JsonAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    [Fact]
    public async Task Search_reports_the_relationship_to_each_user()
    {
        var alice = await _api.CreateUserAsync("searcher");
        var friend = await _api.CreateUserAsync("zfriend");
        var stranger = await _api.CreateUserAsync("zstranger");
        await _api.MakeFriendsAsync(alice, friend);

        var results = await JsonAsync(await _api.ClientFor(alice).GetAsync("/api/friendships/search?q=z"));

        var statuses = results.EnumerateArray().ToDictionary(r => r.GetProperty("id").GetString()!, r => r.GetProperty("status").GetString());
        Assert.Equal("friends", statuses[friend]);
        Assert.Equal("none", statuses[stranger]);
        Assert.DoesNotContain(alice, statuses.Keys);
    }

    [Fact]
    public async Task Search_without_a_query_returns_an_empty_list()
    {
        var alice = await _api.CreateUserAsync("alice");

        var results = await JsonAsync(await _api.ClientFor(alice).GetAsync("/api/friendships/search"));

        Assert.Equal(0, results.GetArrayLength());
    }

    [Fact]
    public async Task Social_overview_splits_friends_incoming_and_outgoing()
    {
        var alice = await _api.CreateUserAsync("alice");
        var friend = await _api.CreateUserAsync("friend");
        var asksAlice = await _api.CreateUserAsync("incoming");
        var askedByAlice = await _api.CreateUserAsync("outgoing");
        await _api.MakeFriendsAsync(alice, friend);
        await _api.ClientFor(asksAlice).PostAsJsonAsync("/api/friendships/request", new { receiverId = alice });
        await _api.ClientFor(alice).PostAsJsonAsync("/api/friendships/request", new { receiverId = askedByAlice });

        var overview = await JsonAsync(await _api.ClientFor(alice).GetAsync("/api/friendships/social-overview"));

        Assert.Equal(friend, overview.GetProperty("friends")[0].GetProperty("id").GetString());
        Assert.Equal(asksAlice, overview.GetProperty("incomingRequests")[0].GetProperty("id").GetString());
        Assert.Equal(askedByAlice, overview.GetProperty("outgoingRequests")[0].GetProperty("id").GetString());
        Assert.Equal(1, overview.GetProperty("pagination").GetProperty("totalItems").GetInt32());
    }

    [Fact]
    public async Task Pending_requests_return_the_count_and_the_senders()
    {
        var alice = await _api.CreateUserAsync("alice");
        var bob = await _api.CreateUserAsync("bob");
        await _api.ClientFor(bob).PostAsJsonAsync("/api/friendships/request", new { receiverId = alice });

        var pending = await JsonAsync(await _api.ClientFor(alice).GetAsync("/api/friendships/requests"));

        Assert.Equal(1, pending.GetProperty("count").GetInt32());
        Assert.Equal(bob, pending.GetProperty("requests")[0].GetProperty("senderId").GetString());
    }

    [Fact]
    public async Task Blocking_is_reflected_in_status_and_blocked_list_until_unblocked()
    {
        var alice = await _api.CreateUserAsync("alice");
        var bob = await _api.CreateUserAsync("bob");
        var aliceClient = _api.ClientFor(alice);

        Assert.Equal(HttpStatusCode.OK, (await aliceClient.PostAsJsonAsync("/api/friendships/block", new { targetUserId = bob })).StatusCode);

        var aliceView = await JsonAsync(await aliceClient.GetAsync($"/api/friendships/block-status/{bob}"));
        var bobView = await JsonAsync(await _api.ClientFor(bob).GetAsync($"/api/friendships/block-status/{alice}"));
        var blocked = await JsonAsync(await aliceClient.GetAsync("/api/friendships/blocked"));
        Assert.True(aliceView.GetProperty("youBlockedPartner").GetBoolean());
        Assert.True(bobView.GetProperty("partnerBlockedYou").GetBoolean());
        Assert.Equal(bob, blocked.GetProperty("blockedUsers")[0].GetProperty("blockedUserId").GetString());

        Assert.Equal(HttpStatusCode.OK, (await aliceClient.PostAsJsonAsync("/api/friendships/unblock", new { targetUserId = bob })).StatusCode);
        var afterUnblock = await JsonAsync(await aliceClient.GetAsync($"/api/friendships/block-status/{bob}"));
        Assert.False(afterUnblock.GetProperty("youBlockedPartner").GetBoolean());
    }

    [Fact]
    public async Task Cannot_block_yourself_or_block_twice()
    {
        var alice = await _api.CreateUserAsync("alice");
        var bob = await _api.CreateUserAsync("bob");
        var client = _api.ClientFor(alice);
        await client.PostAsJsonAsync("/api/friendships/block", new { targetUserId = bob });

        var self = await client.PostAsJsonAsync("/api/friendships/block", new { targetUserId = alice });
        var twice = await client.PostAsJsonAsync("/api/friendships/block", new { targetUserId = bob });

        Assert.Equal(HttpStatusCode.BadRequest, self.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, twice.StatusCode);
    }

    [Fact]
    public async Task Errors_use_the_message_shape_the_app_reads()
    {
        var alice = await _api.CreateUserAsync("alice");

        var response = await _api.ClientFor(alice).PostAsJsonAsync("/api/friendships/request", new { receiverId = "missing-user" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("User not found.", body.GetProperty("message").GetString());
    }
}
