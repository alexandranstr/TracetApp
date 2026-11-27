namespace Tracet.Domain.Entities;

public class Conversation
{
    public int Id { get; set; }
    public string User1Id { get; set; } = string.Empty;
    public string User2Id { get; set; } = string.Empty;
    public string LastMessage { get; set; } = string.Empty;
    public DateTime LastMessageAt { get; set; } = DateTime.UtcNow;

    public List<Message> Messages { get; set; } = new();
    public string? BackgroundTheme { get; set; } = "default";
    public string? MessageColor { get; set; } = "#FF2D55";

    public bool Includes(string userId) => User1Id == userId || User2Id == userId;

    public string PartnerOf(string userId) => User1Id == userId ? User2Id : User1Id;
}