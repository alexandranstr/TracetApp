using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Tracet.Tests.Infrastructure;
using Xunit;

namespace Tracet.Tests.Messaging;

public class MessagingTests : IClassFixture<TracetApiFactory>
{
    private readonly TracetApiFactory _api;

    public MessagingTests(TracetApiFactory api) => _api = api;

    [Fact]
    public async Task Only_friends_can_start_a_conversation_and_it_is_reused()
    {
        var (alice, bob, conversationId) = await _api.FriendsWithConversationAsync();
        var stranger = await _api.CreateUserAsync("stranger");

        var again = await _api.ClientFor(bob).PostAsJsonAsync("/api/messages/get-or-create", new { partnerId = alice });
        var withStranger = await _api.ClientFor(alice).PostAsJsonAsync("/api/messages/get-or-create", new { partnerId = stranger });

        Assert.Equal(conversationId, (await again.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("conversationId").GetInt32());
        Assert.Equal(HttpStatusCode.BadRequest, withStranger.StatusCode);
    }

    [Fact]
    public async Task Sent_message_appears_in_history_and_conversation_list()
    {
        var (alice, bob, conversationId) = await _api.FriendsWithConversationAsync();

        var sent = await _api.ClientFor(alice).SendTextAsync(conversationId, "  Hello Bob  ");
        var history = await _api.ClientFor(bob).GetJsonAsync($"/api/messages/history/{conversationId}");
        var list = await _api.ClientFor(bob).GetJsonAsync("/api/messages/conversations");

        Assert.Equal("Hello Bob", sent.GetProperty("text").GetString());
        Assert.Equal(sent.GetProperty("id").GetInt32(), history.GetProperty("messages")[0].GetProperty("id").GetInt32());
        var entry = list.GetProperty("conversations").EnumerateArray().Single(c => c.GetProperty("conversationId").GetInt32() == conversationId);
        Assert.Equal(alice, entry.GetProperty("partnerId").GetString());
        Assert.Equal("Hello Bob", entry.GetProperty("lastMessage").GetString());
        Assert.Equal(1, entry.GetProperty("unreadCount").GetInt32());
    }

    [Fact]
    public async Task History_is_returned_oldest_first()
    {
        var (alice, _, conversationId) = await _api.FriendsWithConversationAsync();
        var client = _api.ClientFor(alice);
        await client.SendTextAsync(conversationId, "first");
        await client.SendTextAsync(conversationId, "second");

        var messages = (await client.GetJsonAsync($"/api/messages/history/{conversationId}")).GetProperty("messages");

        Assert.Equal(["first", "second"], messages.EnumerateArray().Select(m => m.GetProperty("text").GetString()));
    }

    [Fact]
    public async Task Outsiders_cannot_read_write_or_restyle_a_conversation()
    {
        var (_, _, conversationId) = await _api.FriendsWithConversationAsync();
        var outsider = _api.ClientFor(await _api.CreateUserAsync("outsider"));

        var history = await outsider.GetAsync($"/api/messages/history/{conversationId}");
        var send = await outsider.PostAsJsonAsync("/api/messages/send", new { conversationId, text = "hi" });
        var theme = await outsider.PostAsJsonAsync("/api/messages/update-theme", new { conversationId, theme = "dark" });
        var read = await outsider.PostAsJsonAsync("/api/messages/mark-as-read", new { conversationId });

        Assert.All(new[] { history, send, theme, read }, r => Assert.Equal(HttpStatusCode.Forbidden, r.StatusCode));
    }

    [Fact]
    public async Task Blocked_sender_cannot_send_text_or_images()
    {
        var (alice, bob, conversationId) = await _api.FriendsWithConversationAsync();
        await _api.ClientFor(bob).PostAsJsonAsync("/api/friendships/block", new { targetUserId = alice });
        var client = _api.ClientFor(alice);

        var text = await client.PostAsJsonAsync("/api/messages/send", new { conversationId, text = "hi" });
        var image = await client.PostAsJsonAsync("/api/messages/send-image", new { conversationId, imageUrl = MessagingTestData.FirebaseImageUrl });

        Assert.Equal(HttpStatusCode.BadRequest, text.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, image.StatusCode);
    }

    [Fact]
    public async Task Empty_messages_are_rejected()
    {
        var (alice, _, conversationId) = await _api.FriendsWithConversationAsync();

        var response = await _api.ClientFor(alice).PostAsJsonAsync("/api/messages/send", new { conversationId, text = "   " });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Images_must_come_from_firebase_storage()
    {
        var (alice, _, conversationId) = await _api.FriendsWithConversationAsync();
        var client = _api.ClientFor(alice);

        var stored = await client.PostAsJsonAsync("/api/messages/send-image", new { conversationId, imageUrl = MessagingTestData.FirebaseImageUrl });
        var external = await client.PostAsJsonAsync("/api/messages/send-image", new { conversationId, imageUrl = "https://evil.example/track.gif" });

        Assert.Equal(HttpStatusCode.OK, stored.StatusCode);
        Assert.Equal("Photo", (await stored.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("text").GetString());
        Assert.Equal(HttpStatusCode.BadRequest, external.StatusCode);
    }

    [Fact]
    public async Task Reading_a_conversation_clears_its_unread_count()
    {
        var (alice, bob, conversationId) = await _api.FriendsWithConversationAsync();
        await _api.ClientFor(alice).SendTextAsync(conversationId, "one");
        await _api.ClientFor(alice).SendTextAsync(conversationId, "two");
        var bobClient = _api.ClientFor(bob);

        var response = await bobClient.PostAsJsonAsync("/api/messages/mark-as-read", new { conversationId });
        var list = await bobClient.GetJsonAsync("/api/messages/conversations");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var entry = list.GetProperty("conversations").EnumerateArray().Single(c => c.GetProperty("conversationId").GetInt32() == conversationId);
        Assert.Equal(0, entry.GetProperty("unreadCount").GetInt32());
    }

    [Fact]
    public async Task A_message_can_only_be_marked_read_through_its_own_conversation()
    {
        var (_, bob, conversationId) = await _api.FriendsWithConversationAsync();
        var (carol, _, otherConversationId) = await _api.FriendsWithConversationAsync();
        var foreignMessage = await _api.ClientFor(carol).SendTextAsync(otherConversationId, "private");
        var foreignId = foreignMessage.GetProperty("id").GetInt32();

        var response = await _api.ClientFor(bob).PostAsJsonAsync("/api/messages/mark-message-read",
            new { messageId = foreignId, conversationId });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.False(await _api.WithDbAsync(db => db.Messages.Where(m => m.Id == foreignId).Select(m => m.IsRead).SingleAsync()));
    }

    [Fact]
    public async Task Theme_changes_are_shared_by_both_participants()
    {
        var (alice, bob, conversationId) = await _api.FriendsWithConversationAsync();

        await _api.ClientFor(alice).PostAsJsonAsync("/api/messages/update-theme", new { conversationId, theme = "sunset", messageColor = "#123456" });
        var history = await _api.ClientFor(bob).GetJsonAsync($"/api/messages/history/{conversationId}");

        Assert.Equal("sunset", history.GetProperty("backgroundTheme").GetString());
        Assert.Equal("#123456", history.GetProperty("messageColor").GetString());
    }

    [Theory]
    [InlineData("red")]
    [InlineData("#12345")]
    [InlineData("#12345G")]
    [InlineData("123456#")]
    public async Task Theme_color_must_be_a_hex_color(string messageColor)
    {
        var (alice, _, conversationId) = await _api.FriendsWithConversationAsync();

        var response = await _api.ClientFor(alice).PostAsJsonAsync("/api/messages/update-theme", new { conversationId, theme = "sunset", messageColor });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Conversation_list_can_be_filtered_by_partner_name()
    {
        var (alice, bob, conversationId) = await _api.FriendsWithConversationAsync();

        var match = await _api.ClientFor(alice).GetJsonAsync($"/api/messages/conversations?q={bob[..3]}");
        var noMatch = await _api.ClientFor(alice).GetJsonAsync("/api/messages/conversations?q=zzzz");

        Assert.Contains(conversationId, match.GetProperty("conversations").EnumerateArray().Select(c => c.GetProperty("conversationId").GetInt32()));
        Assert.Equal(0, noMatch.GetProperty("conversations").GetArrayLength());
    }
}
