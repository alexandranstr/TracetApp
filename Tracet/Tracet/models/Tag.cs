namespace Tracet.models;

public class Tag
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public List<LocationTag> LocationTags { get; set; } = new();
}