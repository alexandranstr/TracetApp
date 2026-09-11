namespace Tracet.models;

public class LocationTag
{
    public int LocationId { get; set; }
    public Location Location { get; set; } = null!;

    public int TagId { get; set; }
    public Tag Tag { get; set; } = null!;
}