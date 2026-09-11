namespace Tracet.models;

public class Pin
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string JournalEntry { get; set; } = string.Empty;
    public string Category { get; set; } = "General"; 
    public int? Rating { get; set; }
    public bool IsPrivate { get; set; } = false;
    public DateTime VisitedAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    public int LocationId { get; set; }
    public Location Location { get; set; } = null!;

    public string PhotoUrlsJson { get; set; } = "[]"; 
}