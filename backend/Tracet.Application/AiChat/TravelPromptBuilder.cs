using Tracet.Domain.Constants;
using Tracet.Domain.Entities;

namespace Tracet.Application.AiChat;

public sealed record SavedPlace(Pin Pin, IReadOnlyList<string> Tags);

public sealed record NearbyPlace(Location Location, IReadOnlyList<string> Tags);

public sealed record DestinationContext(string Destination, string? Category, IReadOnlyList<NearbyPlace> Places, bool CategoryMatched);

public sealed record TravelContext(
    User? User,
    IReadOnlyList<SavedPlace> SavedPlaces,
    IReadOnlyList<string> Interests,
    DestinationContext? Destination);

public static class TravelPromptBuilder
{
    private const int SavedPlacesShown = 10;
    private const int InterestsShown = 15;
    private const string Introduction = "a friendly and helpful personal travel assistant for the Tracet app. The user saves pins (places they visit) on the app.";
    private const string Guidance = "Use this information to give personalized, relevant travel advice. Keep responses concise and conversational. If the user asks about places, consider their saved locations and interests. Always be helpful and friendly.";
    private const string TraceyPersona = "Never mention being offline, disconnected, or a fallback assistant — you are Tracey, a regular travel assistant.";

    public static string Build(string provider, TravelContext context)
    {
        var isTracey = provider == AiProviders.Tracey;
        var parts = new List<string> { $"You are {(isTracey ? "Tracey" : "Gemini")}, {Introduction}" };

        if (!string.IsNullOrEmpty(context.User?.DisplayName))
            parts.Add($"The user's name is {context.User.DisplayName}.");
        if (!string.IsNullOrEmpty(context.User?.HomeCountry))
            parts.Add($"The user is from {context.User.HomeCountry}.");
        if (context.SavedPlaces.Count > 0)
            parts.Add($"Here are places the user has saved: {string.Join("; ", context.SavedPlaces.Take(SavedPlacesShown).Select(Describe))}.");
        if (context.Interests.Count > 0)
            parts.Add($"The user is interested in: {string.Join(", ", context.Interests.Take(InterestsShown))}.");
        if (context.Destination is { Places.Count: > 0 } destination)
            parts.Add(DescribeDestination(destination));

        parts.Add(isTracey ? $"{Guidance} {TraceyPersona}" : Guidance);
        return string.Join(" ", parts);
    }

    private static string Describe(SavedPlace place)
    {
        var location = place.Pin.Location;
        return (location.PlaceName ?? place.Pin.Title)
               + Prefixed(", ", location.CityName)
               + Prefixed(", ", location.CountryName)
               + Wrapped(location.Category)
               + (place.Pin.Rating is { } rating ? $" (rated {rating}/5)" : string.Empty)
               + Tagged(place.Tags);
    }

    private static string DescribeDestination(DestinationContext destination)
    {
        var places = string.Join("; ", destination.Places.Select(p =>
            $"{p.Location.PlaceName}, {p.Location.CityName}, {p.Location.CountryName}{Wrapped(p.Location.Category)}{Tagged(p.Tags)}"));

        return destination switch
        {
            { Category: null } => $"Here are places in {destination.Destination} from our database: {places}.",
            { CategoryMatched: true } => $"The user is asking about {destination.Category} places in {destination.Destination}. Here are matching places from our database: {places}.",
            _ => $"The user is asking about {destination.Category} places in {destination.Destination}, but we don't have that specific category. Here are all places in {destination.Destination} from our database: {places}."
        };
    }

    private static string Prefixed(string prefix, string? value) => string.IsNullOrEmpty(value) ? string.Empty : prefix + value;

    private static string Wrapped(string? value) => string.IsNullOrEmpty(value) ? string.Empty : $" ({value})";

    private static string Tagged(IReadOnlyList<string> tags) => tags.Count > 0 ? $" Tags: {string.Join(", ", tags)}" : string.Empty;
}
