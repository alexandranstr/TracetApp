using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Tracet.Tests.Infrastructure;
using Xunit;

namespace Tracet.Tests.Pins;

public class PinLifecycleTests : IClassFixture<TracetApiFactory>
{
    private readonly TracetApiFactory _api;

    public PinLifecycleTests(TracetApiFactory api) => _api = api;

    [Fact]
    public async Task Categories_are_public()
    {
        var categories = await _api.AnonymousClient().GetFromJsonAsync<string[]>("/api/pins/categories");

        Assert.Contains("Cafe", categories!);
    }

    [Fact]
    public async Task Created_pin_appears_in_my_pins_with_its_location()
    {
        var owner = _api.ClientFor(await _api.CreateUserAsync("owner"));

        var created = await owner.CreatePinAsync(PinTestData.NewPin(title: "Tampa", city: "Brasov", country: "Romania"));
        var mine = await owner.GetJsonAsync("/api/pins/my-pins");

        Assert.Equal("Tampa", created.GetProperty("title").GetString());
        Assert.Equal("Brasov", created.GetProperty("location").GetProperty("cityName").GetString());
        Assert.Equal(created.GetProperty("id").GetInt32(), mine.GetProperty("pins")[0].GetProperty("id").GetInt32());
        Assert.Equal(1, mine.GetProperty("pagination").GetProperty("totalItems").GetInt32());
    }

    [Theory]
    [InlineData("category", "NotACategory")]
    [InlineData("rating", 9)]
    [InlineData("title", "")]
    [InlineData("latitude", 120.0)]
    public async Task Create_rejects_invalid_input(string field, object value)
    {
        var owner = _api.ClientFor(await _api.CreateUserAsync("owner"));
        var (lat, lng) = PinTestData.UniqueCoordinates();
        var pin = new Dictionary<string, object?>
        {
            ["title"] = "Valid",
            ["category"] = "Cafe",
            ["rating"] = 3,
            ["visitedAt"] = DateTime.UtcNow,
            ["location"] = new Dictionary<string, object?> { ["latitude"] = lat, ["longitude"] = lng, ["cityName"] = "X", ["countryName"] = "Y" }
        };
        if (field == "latitude") ((Dictionary<string, object?>)pin["location"]!)["latitude"] = value;
        else pin[field] = value;

        var response = await owner.PostAsJsonAsync("/api/pins", pin);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("message").GetString()));
    }

    [Fact]
    public async Task Update_applies_the_same_validation_as_create()
    {
        var owner = _api.ClientFor(await _api.CreateUserAsync("owner"));
        var pin = await owner.CreatePinAsync(PinTestData.NewPin());

        var response = await owner.PutAsJsonAsync($"/api/pins/{pin.GetProperty("id").GetInt32()}", new { rating = 9 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Owner_can_update_toggle_and_delete_their_pin()
    {
        var owner = _api.ClientFor(await _api.CreateUserAsync("owner"));
        var id = (await owner.CreatePinAsync(PinTestData.NewPin())).GetProperty("id").GetInt32();

        var updated = await owner.PutAsJsonAsync($"/api/pins/{id}", new { title = "Renamed", rating = 5 });
        var toggled = await owner.PatchAsync($"/api/pins/{id}/visibility", null);
        var deleted = await owner.DeleteAsync($"/api/pins/{id}");

        Assert.Equal("Renamed", (await updated.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("title").GetString());
        Assert.True((await toggled.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("isPrivate").GetBoolean());
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.False(await _api.WithDbAsync(db => db.Pins.AnyAsync(p => p.Id == id)));
    }

    [Fact]
    public async Task Nobody_else_can_change_or_delete_a_pin()
    {
        var owner = _api.ClientFor(await _api.CreateUserAsync("owner"));
        var other = _api.ClientFor(await _api.CreateUserAsync("other"));
        var id = (await owner.CreatePinAsync(PinTestData.NewPin(title: "Mine"))).GetProperty("id").GetInt32();

        var update = await other.PutAsJsonAsync($"/api/pins/{id}", new { title = "Hacked" });
        var toggle = await other.PatchAsync($"/api/pins/{id}/visibility", null);
        var delete = await other.DeleteAsync($"/api/pins/{id}");

        Assert.Equal(HttpStatusCode.Forbidden, update.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, toggle.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, delete.StatusCode);
        Assert.Equal("Mine", await _api.WithDbAsync(db => db.Pins.Where(p => p.Id == id).Select(p => p.Title).SingleAsync()));
    }

    [Fact]
    public async Task Pins_at_the_same_place_share_one_location_and_count_tags()
    {
        var placeId = $"place-{Guid.NewGuid():N}";
        var first = _api.ClientFor(await _api.CreateUserAsync("first"));
        var second = _api.ClientFor(await _api.CreateUserAsync("second"));

        var a = await first.CreatePinAsync(PinTestData.NewPin(googlePlaceId: placeId, tagsVectorJson: "[1,2]"));
        var b = await second.CreatePinAsync(PinTestData.NewPin(googlePlaceId: placeId, tagsVectorJson: "[1]"));

        var locationId = a.GetProperty("location").GetProperty("id").GetInt32();
        Assert.Equal(locationId, b.GetProperty("location").GetProperty("id").GetInt32());
        var tagCount = await _api.WithDbAsync(db => db.LocationTags
            .Where(lt => lt.LocationId == locationId && lt.TagId == 1).Select(lt => lt.TagCount).SingleAsync());
        Assert.Equal(2, tagCount);
    }

    [Fact]
    public async Task Statistics_count_every_country_and_refresh_after_a_new_pin()
    {
        var owner = _api.ClientFor(await _api.CreateUserAsync("traveller"));
        foreach (var country in new[] { "A", "B", "C", "D", "E" })
            await owner.CreatePinAsync(PinTestData.NewPin(country: country, city: $"City{country}"));
        var before = await owner.GetJsonAsync("/api/pins/statistics");

        await owner.CreatePinAsync(PinTestData.NewPin(country: "F", city: "CityF"));
        var after = await owner.GetJsonAsync("/api/pins/statistics");

        Assert.Equal(5, before.GetProperty("countriesVisited").GetInt32());
        Assert.Equal(6, after.GetProperty("totalPins").GetInt32());
        Assert.Equal(6, after.GetProperty("countriesVisited").GetInt32());
        Assert.Equal(6, after.GetProperty("citiesVisited").GetInt32());
        Assert.Equal(5, after.GetProperty("topCountries").GetArrayLength());
    }
}
