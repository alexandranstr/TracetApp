using Microsoft.AspNetCore.SignalR;
using Tracet.Application.Messaging;

namespace Tracet.Api.Hubs;

public sealed class SignalRChatNotifier(IHubContext<ChatHub> hub) : IChatNotifier
{
    public Task MessageSentAsync(ChatMessage message, IReadOnlyCollection<string> recipients, CancellationToken cancellationToken = default) =>
        hub.Clients.Groups(recipients).SendAsync(ChatEvents.ReceiveMessage, message, cancellationToken);

    public Task ConversationReadAsync(int conversationId, string readerId, IReadOnlyCollection<string> recipients, CancellationToken cancellationToken = default) =>
        hub.Clients.Groups(recipients).SendAsync(ChatEvents.MessagesMarkedRead, conversationId, readerId, cancellationToken);

    public Task MessageReadAsync(int messageId, string readerId, IReadOnlyCollection<string> recipients, CancellationToken cancellationToken = default) =>
        hub.Clients.Groups(recipients).SendAsync(ChatEvents.MessageMarkedRead, messageId, readerId, cancellationToken);
}
