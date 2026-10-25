namespace Tracet.models;

public class Message
{
    public int Id { get; set; }
    public int ConversationId { get; set; }
    public Conversation? Conversation { get; set; }

    public string SenderId { get; set; } = string.Empty;
    public User? Sender { get; set; }

    public string Text { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public bool IsRead { get; set; } = false;
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}