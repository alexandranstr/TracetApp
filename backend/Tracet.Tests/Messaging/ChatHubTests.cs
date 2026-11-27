using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;
using Tracet.Tests.Infrastructure;
using Xunit;

namespace Tracet.Tests.Messaging;

public class ChatHubTests : IClassFixture<TracetApiFactory>
{
    private readonly TracetApiFactory _api;

    public ChatHubTests(TracetApiFactory api) => _api = api;

    [Fact]
    public async Task Participant_can_join_their_conversation()
    {
        var (alice, _, conversationId) = await _api.FriendsWithConversationAsync();
        await using var hub = _api.HubFor(alice);
        await hub.StartAsync();

        await hub.InvokeAsync("JoinConversation", conversationId);
    }

    [Fact]
    public async Task Outsider_cannot_join_someone_elses_conversation()
    {
        var (_, _, conversationId) = await _api.FriendsWithConversationAsync();
        await using var hub = _api.HubFor(await _api.CreateUserAsync("eavesdropper"));
        await hub.StartAsync();

        await Assert.ThrowsAsync<HubException>(() => hub.InvokeAsync("JoinConversation", conversationId));
    }

    [Fact]
    public async Task Receiver_gets_new_messages_in_real_time()
    {
        var (alice, bob, conversationId) = await _api.FriendsWithConversationAsync();
        await using var hub = _api.HubFor(bob);
        var received = new TaskCompletionSource<string>();
        hub.On<System.Text.Json.JsonElement>("ReceiveMessage", m => received.TrySetResult(m.GetProperty("text").GetString()!));
        await hub.StartAsync();

        await _api.ClientFor(alice).SendTextAsync(conversationId, "ping");

        Assert.Equal("ping", await received.Task.WaitAsync(TimeSpan.FromSeconds(10)));
    }
}
