using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace Tracet.Tests.Infrastructure;

public static class MessagingTestData
{
    public const string FirebaseImageUrl = "https://firebasestorage.googleapis.com/v0/b/bucket/o/chat%2Fa.jpg?alt=media&token=t";

    public static async Task<(string Alice, string Bob, int ConversationId)> FriendsWithConversationAsync(this TracetApiFactory api)
    {
        var alice = await api.CreateUserAsync("alice");
        var bob = await api.CreateUserAsync("bob");
        await api.MakeFriendsAsync(alice, bob);
        var response = await api.ClientFor(alice).PostAsJsonAsync("/api/messages/get-or-create", new { partnerId = bob });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return (alice, bob, body.GetProperty("conversationId").GetInt32());
    }

    public static async Task<JsonElement> SendTextAsync(this HttpClient client, int conversationId, string text)
    {
        var response = await client.PostAsJsonAsync("/api/messages/send", new { conversationId, text });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
}
