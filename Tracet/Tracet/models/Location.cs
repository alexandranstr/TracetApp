namespace Tracet.models;

public enum EntityType
{
    POI = 0,
    City = 1,
    Street = 2,
    Area = 3
}

public class Location
{
    public int Id { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string CityName { get; set; } = string.Empty;
    public string CountryName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? PlaceName { get; set; }

    public EntityType EntityType { get; set; } = EntityType.POI;
    public string? GooglePlaceId { get; set; }

    public List<LocationTag> LocationTags { get; set; } = new();
}