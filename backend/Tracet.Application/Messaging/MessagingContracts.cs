using System.ComponentModel.DataAnnotations;
using Tracet.Application.Common;

namespace Tracet.Application.Messaging;

public sealed record StartConversationRequest([Required] string PartnerId);

public sealed record SendMessageRequest(int ConversationId, string? Text);

public sealed record SendImageRequest(int ConversationId, string? ImageUrl, string? Text);

public sealed record UpdateThemeRequest(int ConversationId, string? Theme, string? MessageColor);

public sealed record MarkConversationReadRequest(int ConversationId);

public sealed record MarkMessageReadRequest(int MessageId, int ConversationId);

public sealed record ConversationStarted(int ConversationId, string? BackgroundTheme, string MessageColor);

public sealed record ChatMessage(int Id, int ConversationId, string SenderId, string Text, string? ImageUrl, bool IsRead, DateTime SentAt);

public sealed record ConversationHistory(string BackgroundTheme, string MessageColor, IReadOnlyList<ChatMessage> Messages, int Skip, int Take);

public sealed record ThemeUpdated(bool Success, string? Theme, string? MessageColor);

public sealed record ConversationSummary(
    int ConversationId,
    string PartnerId,
    string Username,
    string DisplayName,
    string? PhotoUrl,
    string LastMessage,
    string LastMessageSenderId,
    DateTime LastMessageAt,
    bool LastMessageRead,
    int UnreadCount,
    string BackgroundTheme,
    string MessageColor,
    bool YouBlockedPartner,
    bool PartnerBlockedYou);

public sealed record ConversationsPage(IReadOnlyList<ConversationSummary> Conversations, Pagination Pagination);
