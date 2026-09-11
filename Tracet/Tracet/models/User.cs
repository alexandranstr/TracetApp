namespace Tracet.models;

public class User
{
    public string Id { get; set; } = Guid.NewGuid().ToString(); 
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public string? HomeCountry { get; set; }
    public bool IsPrivateProfile { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<Pin> Pins { get; set; } = new();
}