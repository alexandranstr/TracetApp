namespace Tracet.Domain.Constants;

public static class PinCategories
{
    public const string Default = "General";

    public static readonly IReadOnlyList<string> All =
    [
        "General",
        "Cafe",
        "Restaurant",
        "Museum",
        "Park",
        "Hotel",
        "Attraction",
        "Shop",
        "Transport",
        "Nature",
        "Nightlife",
        "Sports",
        "Shopping",
        "Accommodation",
        "Landmark"
    ];

    public static bool IsValid(string? category) => category is not null && All.Contains(category);
}
