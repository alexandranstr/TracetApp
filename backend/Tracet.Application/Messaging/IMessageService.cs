using Tracet.Application.Common;

namespace Tracet.Application.Messaging;

public interface IMessageService
{
    Task<ConversationsPage> GetConversationsAsync(string userId, string? partnerNamePrefix, PageRequest page, CancellationToken cancellationToken = default);

    Task<Result<ConversationStarted>> StartConversationAsync(string userId, string partnerId, CancellationToken cancellationToken = default);

    Task<Result<ConversationHistory>> GetHistoryAsync(string userId, int conversationId, int skip, int take, CancellationToken cancellationToken = default);

    Task<Result<ChatMessage>> SendTextAsync(string userId, SendMessageRequest request, CancellationToken cancellationToken = default);

    Task<Result<ChatMessage>> SendImageAsync(string userId, SendImageRequest request, CancellationToken cancellationToken = default);

    Task<Result<ThemeUpdated>> UpdateThemeAsync(string userId, UpdateThemeRequest request, CancellationToken cancellationToken = default);

    Task<Result> MarkConversationReadAsync(string userId, int conversationId, CancellationToken cancellationToken = default);

    Task<Result> MarkMessageReadAsync(string userId, MarkMessageReadRequest request, CancellationToken cancellationToken = default);

    Task<bool> IsParticipantAsync(string userId, int conversationId, CancellationToken cancellationToken = default);
}
