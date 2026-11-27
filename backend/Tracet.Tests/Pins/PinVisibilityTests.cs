using System.Net.Http.Json;
using System.Text.Json;
using Tracet.Tests.Infrastructure;
using Xunit;

namespace Tracet.Tests.Pins;

public class PinVisibilityTests : IClassFixture<TracetApiFactory>
{
    private readonly TracetApiFactory _api;

    public PinVisibilityTests(TracetApiFactory api) => _api = api;

    private async Task<(string Owner, int PublicPin, int PrivatePin, (double, double) At)> OwnerWithPinsAsync()
    {
        var owner = await _api.CreateUserAsync("owner");
        var at = PinTestData.UniqueCoordinates();
        var client = _api.ClientFor(owner);
        var publicPin = await client.CreatePinAsync(PinTestData.NewPin(title: "Public", at: at));
        var privatePin = await client.CreatePinAsync(PinTestData.NewPin(title: "Private", isPrivate: true, at: (at.Latitude + 0.0005, at.Longitude)));
        return (owner, publicPin.GetProperty("id").GetInt32(), privatePin.GetProperty("id").GetInt32(), at);
    }

    private static string NearbyUrl((double Latitude, double Longitude) at) =>
        FormattableString.Invariant(
            $"/api/pins/nearby?swLat={at.Latitude - 0.01}&swLng={at.Longitude - 0.01}&neLat={at.Latitude + 0.01}&neLng={at.Longitude + 0.01}");

    [Fact]
    public async Task Owner_sees_their_public_and_private_pins()
    {
        var (owner, publicPin, privatePin, at) = await OwnerWithPinsAsync();

        var nearby = await _api.ClientFor(owner).GetJsonAsync(NearbyUrl(at));

        Assert.Contains(publicPin, nearby.Ids());
        Assert.Contains(privatePin, nearby.Ids());
    }

    [Fact]
    public async Task Friend_sees_only_public_pins_everywhere()
    {
        var (owner, publicPin, privatePin, at) = await OwnerWithPinsAsync();
        var friend = await _api.CreateUserAsync("friend");
        await _api.MakeFriendsAsync(owner, friend);
        var client = _api.ClientFor(friend);

        var nearby = await client.GetJsonAsync(NearbyUrl(at));
        var all = (await client.GetJsonAsync("/api/pins?pageSize=50")).GetProperty("pins");
        var shared = (await client.GetJsonAsync("/api/pins/shared-history?pageSize=50")).GetProperty("pins");

        foreach (var list in new[] { nearby, all, shared })
        {
            Assert.Contains(publicPin, list.Ids());
            Assert.DoesNotContain(privatePin, list.Ids());
        }
    }

    [Fact]
    public async Task Stranger_sees_no_pins()
    {
        var (_, publicPin, _, at) = await OwnerWithPinsAsync();
        var stranger = _api.ClientFor(await _api.CreateUserAsync("stranger"));

        Assert.DoesNotContain(publicPin, (await stranger.GetJsonAsync(NearbyUrl(at))).Ids());
        Assert.DoesNotContain(publicPin, (await stranger.GetJsonAsync("/api/pins?pageSize=50")).GetProperty("pins").Ids());
    }

    [Fact]
    public async Task Blocking_hides_pins_in_both_directions()
    {
        var (owner, publicPin, _, at) = await OwnerWithPinsAsync();
        var friend = await _api.CreateUserAsync("friend");
        await _api.MakeFriendsAsync(owner, friend);
        await _api.ClientFor(owner).PostAsJsonAsync("/api/friendships/block", new { targetUserId = friend });

        var friendClient = _api.ClientFor(friend);
        Assert.DoesNotContain(publicPin, (await friendClient.GetJsonAsync(NearbyUrl(at))).Ids());
        Assert.DoesNotContain(publicPin, (await friendClient.GetJsonAsync("/api/pins/shared-history")).GetProperty("pins").Ids());
    }

    [Fact]
    public async Task Shared_history_excludes_your_own_pins_and_includes_the_author()
    {
        var (owner, publicPin, _, _) = await OwnerWithPinsAsync();
        var friend = await _api.CreateUserAsync("friend");
        await _api.MakeFriendsAsync(owner, friend);

        var ownShared = (await _api.ClientFor(owner).GetJsonAsync("/api/pins/shared-history")).GetProperty("pins");
        var friendShared = (await _api.ClientFor(friend).GetJsonAsync("/api/pins/shared-history")).GetProperty("pins");

        Assert.DoesNotContain(publicPin, ownShared.Ids());
        var pin = friendShared.EnumerateArray().Single(p => p.GetProperty("id").GetInt32() == publicPin);
        Assert.Equal(owner.ToLowerInvariant(), pin.GetProperty("userName").GetString());
        Assert.Equal(JsonValueKind.Object, pin.GetProperty("location").ValueKind);
    }
}
