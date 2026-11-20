using System.ComponentModel.DataAnnotations;

namespace Tracet.DTOs
{
    public class AiChatRequestDto
    {
        [Required]
        [StringLength(5000, ErrorMessage = "Message cannot exceed 5000 characters.")]
        public string Message { get; set; } = string.Empty;

        // Optional: user can explicitly choose "gemini" or "tracey"
        [StringLength(50, ErrorMessage = "Provider cannot exceed 50 characters.")]
        public string? Provider { get; set; }
    }
}