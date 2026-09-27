using Tracet.models;

namespace Tracet.DTOs;

public class CreatePinDto
{
    public string Title { get; set; } = string.Empty;
    public string JournalEntry { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public int? Rating { get; set; }
    public bool IsPrivate { get; set; }
    public DateTime VisitedAt { get; set; }
    public string UserId { get; set; } = string.Empty;

    public CreateLocationDto Location { get; set; } = null!;
    public string PhotoUrlsJson { get; set; } = "[]";
    public string TagsVectorJson { get; set; } = "[]";
}

public class CreateLocationDto
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string CityName { get; set; } = string.Empty;
    public string CountryName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? PlaceName { get; set; }
    public EntityType EntityType { get; set; } = EntityType.POI;
    public string? GooglePlaceId { get; set; }
}

public class PinResponseDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string JournalEntry { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public int? Rating { get; set; }
    public bool IsPrivate { get; set; }
    public DateTime VisitedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public string UserId { get; set; } = string.Empty;

    public string PhotoUrlsJson { get; set; } = "[]";
    public string TagsVectorJson { get; set; } = "[]";
    public LocationResponseDto Location { get; set; } = null!;
}

public class LocationResponseDto
{
    public int Id { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string CityName { get; set; } = string.Empty;
    public string CountryName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? PlaceName { get; set; }
    public int EntityType { get; set; }
    public string? GooglePlaceId { get; set; }
}