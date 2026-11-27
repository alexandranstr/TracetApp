using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Tracet.Application.Messaging;

namespace Tracet.Api.Hubs;

public static class ChatEvents
{
    public const string ReceiveMessage = "ReceiveMessage";
    public const string MessagesMarkedRead = "MessagesMarkedRead";
    public const string MessageMarkedRead = "MessageMarkedRead";
    public const string UserTyping = "UserTyping";
    public const string UserStopTyping = "UserStopTyping";
}

[Authorize]
public class ChatHub(IMessageService messages) : Hub
{
    private const string JoinedConversationsKey = "joined-conversations";

    private string UserId => Context.UserIdentifier!;

    private HashSet<int> JoinedConversations =>
        (HashSet<int>)(Context.Items[JoinedConversationsKey] ??= new HashSet<int>());

    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, UserId);
        await base.OnConnectedAsync();
    }

    public async Task JoinConversation(int conversationId)
    {
        if (!await messages.IsParticipantAsync(UserId, conversationId))
            throw new HubException("You are not part of this conversation.");

        JoinedConversations.Add(conversationId);
        await Groups.AddToGroupAsync(Context.ConnectionId, ConversationGroup(conversationId));
    }

    public async Task LeaveConversation(int conversationId)
    {
        JoinedConversations.Remove(conversationId);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, ConversationGroup(conversationId));
    }

    public Task StartTyping(int conversationId) => NotifyOthers(conversationId, ChatEvents.UserTyping);

    public Task StopTyping(int conversationId) => NotifyOthers(conversationId, ChatEvents.UserStopTyping);

    private Task NotifyOthers(int conversationId, string chatEvent) =>
        JoinedConversations.Contains(conversationId)
            ? Clients.OthersInGroup(ConversationGroup(conversationId)).SendAsync(chatEvent, UserId)
            : Task.CompletedTask;

    private static string ConversationGroup(int conversationId) => $"conv_{conversationId}";
}
