using Tracet.Domain.Constants;

namespace Tracet.Domain.Entities;

public class AIChatHistory
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string? Provider { get; set; } = AiProviders.Gemini;
}