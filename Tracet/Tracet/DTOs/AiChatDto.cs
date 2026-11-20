namespace Tracet.DTOs
{
    public class AiChatRequestDto
    {
        public string Message { get; set; } = string.Empty;
        // Optional: user can explicitly choose "gemini" or "tracey"
        public string? Provider { get; set; }
    }
}