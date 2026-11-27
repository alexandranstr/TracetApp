using System.ComponentModel.DataAnnotations;
using Tracet.Application.Common;

namespace Tracet.Application.AiChat;

public sealed record AiChatRequest(
    [StringLength(5000, ErrorMessage = "Message cannot exceed 5000 characters.")] string? Message,
    [StringLength(50, ErrorMessage = "Provider cannot exceed 50 characters.")] string? Provider);

public sealed record AiChatReply(string Response, bool GeminiUnavailable);

public sealed record AiHistoryMessage(string Id, string Sender, string Text, DateTime Timestamp, string Provider);

public sealed record AiHistoryPage(IReadOnlyList<AiHistoryMessage> Messages, Pagination Pagination);
