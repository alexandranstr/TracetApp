using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Tracet.Tests.Infrastructure;
using Xunit;

namespace Tracet.Tests.Friendships;

public class FriendRequestTests : IClassFixture<TracetApiFactory>
{
    private readonly TracetApiFactory _api;

    public FriendRequestTests(TracetApiFactory api) => _api = api;

    private Task<string?> FriendshipStatusAsync(string a, string b) =>
        _api.WithDbAsync(db => db.Friendships
            .Where(f => (f.UserId == a && f.FriendId == b) || (f.UserId == b && f.FriendId == a))
            .Select(f => (string?)f.Status)
            .SingleOrDefaultAsync());

    [Fact]
    public async Task Anonymous_request_is_rejected_with_401()
    {
        var response = await _api.AnonymousClient().GetAsync("/api/friendships/requests");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Sender_can_send_a_friend_request()
    {
        var alice = await _api.CreateUserAsync("alice");
        var bob = await _api.CreateUserAsync("bob");

        var response = await _api.ClientFor(alice)
            .PostAsJsonAsync("/api/friendships/request", new { receiverId = bob });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Pending", await FriendshipStatusAsync(alice, bob));
    }

    // Regression test for S-2: a sender could accept their own request and force a friendship.
    [Fact]
    public async Task Sender_cannot_accept_their_own_friend_request()
    {
        var alice = await _api.CreateUserAsync("alice");
        var bob = await _api.CreateUserAsync("bob");
        var aliceClient = _api.ClientFor(alice);
        await aliceClient.PostAsJsonAsync("/api/friendships/request", new { receiverId = bob });

        var response = await aliceClient.PostAsJsonAsync("/api/friendships/respond",
            new { senderId = bob, action = "accept" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("Pending", await FriendshipStatusAsync(alice, bob));
    }

    [Fact]
    public async Task Receiver_can_accept_and_a_conversation_is_created()
    {
        var alice = await _api.CreateUserAsync("alice");
        var bob = await _api.CreateUserAsync("bob");
        await _api.ClientFor(alice).PostAsJsonAsync("/api/friendships/request", new { receiverId = bob });

        var response = await _api.ClientFor(bob).PostAsJsonAsync("/api/friendships/respond",
            new { senderId = alice, action = "accept" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Accepted", await FriendshipStatusAsync(alice, bob));
        var conversations = await _api.WithDbAsync(db => db.Conversations.CountAsync(c =>
            (c.User1Id == alice && c.User2Id == bob) || (c.User1Id == bob && c.User2Id == alice)));
        Assert.Equal(1, conversations);
    }

    [Fact]
    public async Task Receiver_can_decline()
    {
        var alice = await _api.CreateUserAsync("alice");
        var bob = await _api.CreateUserAsync("bob");
        await _api.ClientFor(alice).PostAsJsonAsync("/api/friendships/request", new { receiverId = bob });

        var response = await _api.ClientFor(bob).PostAsJsonAsync("/api/friendships/respond",
            new { senderId = alice, action = "decline" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Declined", await FriendshipStatusAsync(alice, bob));
    }

    [Fact]
    public async Task Respond_rejects_an_unknown_action()
    {
        var alice = await _api.CreateUserAsync("alice");
        var bob = await _api.CreateUserAsync("bob");
        await _api.ClientFor(alice).PostAsJsonAsync("/api/friendships/request", new { receiverId = bob });

        var response = await _api.ClientFor(bob).PostAsJsonAsync("/api/friendships/respond",
            new { senderId = alice, action = "block-everyone" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("Pending", await FriendshipStatusAsync(alice, bob));
    }

    [Fact]
    public async Task Cannot_send_a_friend_request_to_yourself()
    {
        var alice = await _api.CreateUserAsync("alice");

        var response = await _api.ClientFor(alice)
            .PostAsJsonAsync("/api/friendships/request", new { receiverId = alice });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
