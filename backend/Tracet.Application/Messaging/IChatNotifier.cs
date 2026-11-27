namespace Tracet.Application.Messaging;

public interface IChatNotifier
{
    Task MessageSentAsync(ChatMessage message, IReadOnlyCollection<string> recipients, CancellationToken cancellationToken = default);

    Task ConversationReadAsync(int conversationId, string readerId, IReadOnlyCollection<string> recipients, CancellationToken cancellationToken = default);

    Task MessageReadAsync(int messageId, string readerId, IReadOnlyCollection<string> recipients, CancellationToken cancellationToken = default);
}
