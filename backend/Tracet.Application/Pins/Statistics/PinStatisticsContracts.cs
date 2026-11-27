namespace Tracet.Application.Pins.Statistics;

public sealed record CountryCount(string Country, int Count);

public sealed record CityCount(string City, int Count);

public sealed record CategoryCount(string Category, int Count);

public sealed record TagCount(string TagName, int Count);

public sealed record MonthCount(int Month, int Year, int Count);

public sealed record PinStatistics(
    int TotalPins,
    double AverageRating,
    int CountriesVisited,
    int CitiesVisited,
    IReadOnlyList<CountryCount> TopCountries,
    IReadOnlyList<CityCount> TopCities,
    IReadOnlyList<CategoryCount> TopCategories,
    IReadOnlyList<TagCount> TopTags,
    IReadOnlyList<MonthCount> PinsByMonth);
