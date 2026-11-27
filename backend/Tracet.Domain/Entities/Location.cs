using Tracet.Domain.Enums;

namespace Tracet.Domain.Entities;

public class Location
{
    public int Id { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string CityName { get; set; } = string.Empty;
    public string CountryName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? PlaceName { get; set; }
    public string? Category { get; set; }

    public EntityType EntityType { get; set; } = EntityType.POI;
    public string? GooglePlaceId { get; set; }

    public List<LocationTag> LocationTags { get; set; } = new();

    public string DisplayName
    {
        get
        {
            var parts = new[] { PlaceName, CityName, CountryName }.Where(part => !string.IsNullOrEmpty(part)).ToList();
            return parts.Count > 0 ? string.Join(", ", parts) : "A saved location";
        }
    }
}