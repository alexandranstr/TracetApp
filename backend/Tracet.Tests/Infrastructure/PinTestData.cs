using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace Tracet.Tests.Infrastructure;

public static class PinTestData
{
    private static int _coordinateSeed;

    public static (double Latitude, double Longitude) UniqueCoordinates()
    {
        var n = Interlocked.Increment(ref _coordinateSeed);
        return (-60 + n * 0.01, -150 + n * 0.01);
    }

    public static object NewPin(
        string title = "Test pin",
        string category = "Cafe",
        int? rating = 4,
        bool isPrivate = false,
        string country = "Romania",
        string city = "Brasov",
        string? googlePlaceId = null,
        string tagsVectorJson = "[]",
        (double Latitude, double Longitude)? at = null)
    {
        var (lat, lng) = at ?? UniqueCoordinates();
        return new
        {
            title,
            journalEntry = "Lovely place",
            category,
            rating,
            isPrivate,
            visitedAt = DateTime.UtcNow,
            location = new
            {
                latitude = lat,
                longitude = lng,
                cityName = city,
                countryName = country,
                placeName = title,
                googlePlaceId
            },
            photoUrlsJson = "[]",
            tagsVectorJson
        };
    }

    public static async Task<JsonElement> CreatePinAsync(this HttpClient client, object pin)
    {
        var response = await client.PostAsJsonAsync("/api/pins", pin);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    public static async Task<JsonElement> GetJsonAsync(this HttpClient client, string url)
    {
        var response = await client.GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    public static IEnumerable<int> Ids(this JsonElement pins) =>
        pins.EnumerateArray().Select(p => p.GetProperty("id").GetInt32());
}
