namespace Tracet.models;

public class AIChatHistory
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    // Which AI provider handled this message: "gemini" or "tracey"
    public string? Provider { get; set; } = "gemini";
}