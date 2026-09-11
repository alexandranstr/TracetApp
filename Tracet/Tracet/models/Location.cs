namespace Tracet.models;

public class Location
{
    public int Id { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string CityName { get; set; } = string.Empty;
    public string CountryName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? PlaceName { get; set; }

    public List<LocationTag> LocationTags { get; set; } = new();
}