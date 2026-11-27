using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Tracet.Domain.Entities;
using Tracet.Tests.Infrastructure;
using Xunit;

namespace Tracet.Tests.Accounts;

public class AccountTests : IClassFixture<TracetApiFactory>
{
    private readonly TracetApiFactory _api;

    public AccountTests(TracetApiFactory api) => _api = api;

    [Fact]
    public async Task Sync_creates_the_user_from_the_token_and_keeps_existing_data()
    {
        var userId = TestData.NewUserId("newbie");
        var client = _api.ClientFor(userId);

        var first = await client.PostAsync("/api/auth/sync", null);
        await client.PutAsJsonAsync("/api/auth/profile", new { displayName = "Chosen Name" });
        var second = await (await client.PostAsync("/api/auth/sync", null)).Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(userId, second.GetProperty("id").GetString());
        Assert.Equal($"{userId}@test.local", second.GetProperty("email").GetString());
        Assert.Equal("Chosen Name", second.GetProperty("displayName").GetString());
    }

    [Fact]
    public async Task Profile_is_returned_for_the_signed_in_user()
    {
        var userId = await _api.CreateUserAsync("profiled");

        var profile = await _api.ClientFor(userId).GetJsonAsync("/api/auth/profile");

        Assert.Equal(userId.ToLowerInvariant(), profile.GetProperty("username").GetString());
        Assert.False(profile.GetProperty("isTwoFactorEnabled").GetBoolean());
    }

    [Fact]
    public async Task Username_is_normalised_unique_and_length_checked()
    {
        var taken = await _api.CreateUserAsync("taken");
        var client = _api.ClientFor(await _api.CreateUserAsync("renamer"));
        var wanted = $"New_{Guid.NewGuid():N}"[..20];

        var ok = await client.PutAsJsonAsync("/api/auth/profile", new { username = wanted, homeCountry = "Romania" });
        var duplicate = await client.PutAsJsonAsync("/api/auth/profile", new { username = taken.ToLowerInvariant() });
        var tooShort = await client.PutAsJsonAsync("/api/auth/profile", new { username = "ab" });

        var profile = await ok.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(wanted.ToLowerInvariant(), profile.GetProperty("username").GetString());
        Assert.Equal("Romania", profile.GetProperty("homeCountry").GetString());
        Assert.Equal(HttpStatusCode.BadRequest, duplicate.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, tooShort.StatusCode);
    }

    [Fact]
    public async Task Two_factor_needs_a_phone_number()
    {
        var client = _api.ClientFor(await _api.CreateUserAsync("secure"));

        var withoutPhone = await client.PutAsJsonAsync("/api/auth/toggle-2fa", new { enable = true });
        await client.PutAsJsonAsync("/api/auth/profile", new { phoneNumber = "+40712345678" });
        var withPhone = await client.PutAsJsonAsync("/api/auth/toggle-2fa", new { enable = true });

        Assert.Equal(HttpStatusCode.BadRequest, withoutPhone.StatusCode);
        Assert.True((await withPhone.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("isTwoFactorEnabled").GetBoolean());
    }

    [Fact]
    public async Task Username_resolves_to_the_email()
    {
        var target = await _api.CreateUserAsync("findme");
        var client = _api.ClientFor(await _api.CreateUserAsync("seeker"));

        var found = await client.GetJsonAsync($"/api/auth/resolve-email?username=@{target.ToLowerInvariant()}");
        var missing = await client.GetAsync("/api/auth/resolve-email?username=nobody-here");

        Assert.Equal($"{target}@test.local", found.GetProperty("email").GetString());
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }

    [Fact]
    public async Task Deleting_an_account_removes_all_of_its_data_and_files()
    {
        var (alice, bob, conversationId) = await _api.FriendsWithConversationAsync();
        var blockedByAlice = await _api.CreateUserAsync("blockedbyalice");
        var blocksAlice = await _api.CreateUserAsync("blocksalice");
        var aliceClient = _api.ClientFor(alice);
        var ownPhoto = $"https://firebasestorage.googleapis.com/v0/b/bucket/o/pins%2F{alice}%2Fa.jpg?alt=media";
        var ownChatImage = $"https://firebasestorage.googleapis.com/v0/b/bucket/o/chat%2F{alice}%2Fb.jpg?alt=media";

        var pin = await aliceClient.PostAsJsonAsync("/api/pins", PinTestData.NewPin());
        var pinId = (await pin.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        await aliceClient.PutAsJsonAsync($"/api/pins/{pinId}", new { photoUrlsJson = JsonSerializer.Serialize(new[] { ownPhoto }) });
        await aliceClient.PostAsJsonAsync("/api/messages/send-image", new { conversationId, imageUrl = ownChatImage });
        await aliceClient.PostAsJsonAsync("/api/friendships/block", new { targetUserId = blockedByAlice });
        await _api.ClientFor(blocksAlice).PostAsJsonAsync("/api/friendships/block", new { targetUserId = alice });
        await _api.WithDbAsync(async db =>
        {
            db.AIChatHistories.Add(new AIChatHistory { UserId = alice, Role = "user", Content = "hi", Provider = "gemini" });
            await db.SaveChangesAsync();
        });

        var response = await aliceClient.DeleteAsync("/api/auth/account");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await _api.WithDbAsync(async db =>
        {
            Assert.False(await db.Users.AnyAsync(u => u.Id == alice));
            Assert.True(await db.Users.AnyAsync(u => u.Id == bob));
            Assert.False(await db.Pins.AnyAsync(p => p.UserId == alice));
            Assert.False(await db.Messages.AnyAsync(m => m.SenderId == alice));
            Assert.False(await db.Conversations.AnyAsync(c => c.Id == conversationId));
            Assert.False(await db.Friendships.AnyAsync(f => f.UserId == alice || f.FriendId == alice));
            Assert.False(await db.BlockedUsers.AnyAsync(b => b.UserId == alice || b.BlockedUserId == alice));
            Assert.False(await db.AIChatHistories.AnyAsync(h => h.UserId == alice));
        });
        Assert.Contains(alice, _api.Identity.DeletedUsers);
        Assert.Contains((alice, ownPhoto), _api.Storage.DeletedFiles);
        Assert.Contains((alice, ownChatImage), _api.Storage.DeletedFiles);
    }
}
