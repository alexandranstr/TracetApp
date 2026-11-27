using Microsoft.EntityFrameworkCore;
using Tracet.Application.Abstractions;
using Tracet.Application.Common;
using Tracet.Application.Conversations;
using Tracet.Application.Social;
using Tracet.Domain.Entities;

namespace Tracet.Application.Messaging;

public sealed class MessageService(IAppDbContext db, ISocialGraph socialGraph, IChatNotifier notifier) : IMessageService
{
    private const int DefaultHistorySize = 50;
    private const int MaxHistorySize = 200;

    public async Task<ConversationsPage> GetConversationsAsync(
        string userId, string? partnerNamePrefix, PageRequest page, CancellationToken cancellationToken = default)
    {
        var query = db.Conversations.Where(ConversationQueries.Involving(userId));

        if (!string.IsNullOrWhiteSpace(partnerNamePrefix))
        {
            var prefix = partnerNamePrefix.Trim().ToLower();
            query = query.Where(c => db.Users.Any(u =>
                u.Id == (c.User1Id == userId ? c.User2Id : c.User1Id) &&
                (u.Username.ToLower().StartsWith(prefix) || u.DisplayName.ToLower().StartsWith(prefix))));
        }

        var (conversations, pagination) = await query
            .OrderByDescending(c => c.LastMessageAt)
            .ToPageAsync(page, cancellationToken);

        var conversationIds = conversations.Select(c => c.Id).ToList();
        var partnerIds = conversations.Select(c => c.PartnerOf(userId)).Distinct().ToList();

        var partners = await db.Users
            .Where(u => partnerIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, cancellationToken);

        var lastMessages = await db.Messages
            .Where(m => conversationIds.Contains(m.ConversationId))
            .GroupBy(m => m.ConversationId)
            .Select(g => g.OrderByDescending(m => m.SentAt).First())
            .ToDictionaryAsync(m => m.ConversationId, cancellationToken);

        var unreadCounts = await db.Messages
            .Where(m => conversationIds.Contains(m.ConversationId) && m.SenderId != userId && !m.IsRead)
            .GroupBy(m => m.ConversationId)
            .Select(g => new { ConversationId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ConversationId, x => x.Count, cancellationToken);

        var blocks = await socialGraph.GetBlockRelationsAsync(userId, cancellationToken);

        var summaries = conversations
            .Where(c => partners.ContainsKey(c.PartnerOf(userId)))
            .Select(c =>
            {
                var partner = partners[c.PartnerOf(userId)];
                var last = lastMessages.GetValueOrDefault(c.Id);
                return new ConversationSummary(
                    c.Id,
                    partner.Id,
                    partner.Username,
                    partner.PublicName,
                    partner.PhotoUrl,
                    Preview(last) ?? c.LastMessage,
                    last?.SenderId ?? string.Empty,
                    c.LastMessageAt,
                    last is null || last.SenderId != userId || last.IsRead,
                    unreadCounts.GetValueOrDefault(c.Id),
                    c.BackgroundTheme ?? MessagingRules.DefaultTheme,
                    c.MessageColor ?? MessagingRules.DefaultMessageColor,
                    blocks.BlockedByUser.Contains(partner.Id),
                    blocks.BlockingUser.Contains(partner.Id));
            })
            .ToList();

        return new ConversationsPage(summaries, pagination);
    }

    public async Task<Result<ConversationStarted>> StartConversationAsync(
        string userId, string partnerId, CancellationToken cancellationToken = default)
    {
        if (userId == partnerId)
            return Error.Validation("Cannot create a conversation with yourself.");
        if (!await db.Users.AnyAsync(u => u.Id == partnerId, cancellationToken))
            return Error.NotFound("Partner user not found.");
        if (!await socialGraph.AreFriendsAsync(userId, partnerId, cancellationToken))
            return Error.Validation("You can only message accepted friends.");

        var conversation = await db.GetOrAddConversationAsync(userId, partnerId, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        return new ConversationStarted(
            conversation.Id,
            conversation.BackgroundTheme,
            conversation.MessageColor ?? MessagingRules.DefaultMessageColor);
    }

    public async Task<Result<ConversationHistory>> GetHistoryAsync(
        string userId, int conversationId, int skip, int take, CancellationToken cancellationToken = default)
    {
        var access = await JoinedConversationAsync(userId, conversationId, cancellationToken);
        if (!access.IsSuccess)
            return access.Error!;

        skip = Math.Max(0, skip);
        take = take is <= 0 or > MaxHistorySize ? DefaultHistorySize : take;

        var newestFirst = await db.Messages
            .Where(m => m.ConversationId == conversationId)
            .OrderByDescending(m => m.SentAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);

        var conversation = access.Value;
        return new ConversationHistory(
            conversation.BackgroundTheme ?? MessagingRules.DefaultTheme,
            conversation.MessageColor ?? MessagingRules.DefaultMessageColor,
            newestFirst.AsEnumerable().Reverse().Select(ToChatMessage).ToList(),
            skip,
            take);
    }

    public Task<Result<ChatMessage>> SendTextAsync(
        string userId, SendMessageRequest request, CancellationToken cancellationToken = default) =>
        MessagingRules.ValidateText(request.Text) is { } error
            ? Task.FromResult<Result<ChatMessage>>(error)
            : SendAsync(userId, request.ConversationId, request.Text!.Trim(), null, cancellationToken);

    public Task<Result<ChatMessage>> SendImageAsync(
        string userId, SendImageRequest request, CancellationToken cancellationToken = default) =>
        MessagingRules.ValidateImage(request.ImageUrl, request.Text) is { } error
            ? Task.FromResult<Result<ChatMessage>>(error)
            : SendAsync(
                userId,
                request.ConversationId,
                string.IsNullOrWhiteSpace(request.Text) ? MessagingRules.ImageFallbackText : request.Text.Trim(),
                request.ImageUrl,
                cancellationToken);

    public async Task<Result<ThemeUpdated>> UpdateThemeAsync(
        string userId, UpdateThemeRequest request, CancellationToken cancellationToken = default)
    {
        var access = await JoinedConversationAsync(userId, request.ConversationId, cancellationToken);
        if (!access.IsSuccess)
            return access.Error!;
        if (MessagingRules.ValidateTheme(request.Theme, request.MessageColor) is { } error)
            return error;

        var conversation = access.Value;
        conversation.BackgroundTheme = request.Theme ?? conversation.BackgroundTheme;
        conversation.MessageColor = request.MessageColor ?? conversation.MessageColor;
        await db.SaveChangesAsync(cancellationToken);

        return new ThemeUpdated(true, conversation.BackgroundTheme, conversation.MessageColor);
    }

    public async Task<Result> MarkConversationReadAsync(
        string userId, int conversationId, CancellationToken cancellationToken = default)
    {
        var access = await JoinedConversationAsync(userId, conversationId, cancellationToken);
        if (!access.IsSuccess)
            return access.Error!;

        var unread = await db.Messages
            .Where(m => m.ConversationId == conversationId && m.SenderId != userId && !m.IsRead)
            .ToListAsync(cancellationToken);
        if (unread.Count == 0)
            return Result.Success();

        unread.ForEach(m => m.IsRead = true);
        await db.SaveChangesAsync(cancellationToken);
        await notifier.ConversationReadAsync(conversationId, userId, Participants(access.Value), cancellationToken);
        return Result.Success();
    }

    public async Task<Result> MarkMessageReadAsync(
        string userId, MarkMessageReadRequest request, CancellationToken cancellationToken = default)
    {
        var access = await JoinedConversationAsync(userId, request.ConversationId, cancellationToken);
        if (!access.IsSuccess)
            return access.Error!;

        var message = await db.Messages.FirstOrDefaultAsync(
            m => m.Id == request.MessageId && m.ConversationId == request.ConversationId, cancellationToken);
        if (message is null)
            return Error.NotFound("Message not found.");
        if (message.SenderId == userId || message.IsRead)
            return Result.Success();

        message.IsRead = true;
        await db.SaveChangesAsync(cancellationToken);
        await notifier.MessageReadAsync(message.Id, userId, Participants(access.Value), cancellationToken);
        return Result.Success();
    }

    public Task<bool> IsParticipantAsync(string userId, int conversationId, CancellationToken cancellationToken = default) =>
        db.Conversations.Where(ConversationQueries.Involving(userId)).AnyAsync(c => c.Id == conversationId, cancellationToken);

    private async Task<Result<ChatMessage>> SendAsync(
        string senderId, int conversationId, string text, string? imageUrl, CancellationToken cancellationToken)
    {
        var access = await JoinedConversationAsync(senderId, conversationId, cancellationToken);
        if (!access.IsSuccess)
            return access.Error!;

        var conversation = access.Value;
        if (await socialGraph.HasBlockedAsync(conversation.PartnerOf(senderId), senderId, cancellationToken))
            return Error.Validation("You cannot send messages to this user.");

        var message = db.Messages.Add(new Message
        {
            ConversationId = conversationId,
            SenderId = senderId,
            Text = text,
            ImageUrl = imageUrl,
            IsRead = false,
            SentAt = DateTime.UtcNow
        }).Entity;

        conversation.LastMessage = text;
        conversation.LastMessageAt = message.SentAt;
        await db.SaveChangesAsync(cancellationToken);

        var sent = ToChatMessage(message);
        await notifier.MessageSentAsync(sent, Participants(conversation), cancellationToken);
        return sent;
    }

    private async Task<Result<Conversation>> JoinedConversationAsync(
        string userId, int conversationId, CancellationToken cancellationToken)
    {
        var conversation = await db.Conversations.FirstOrDefaultAsync(c => c.Id == conversationId, cancellationToken);
        if (conversation is null)
            return Error.NotFound("Conversation not found.");
        if (!conversation.Includes(userId))
            return Error.Forbidden("You are not part of this conversation.");
        return conversation;
    }

    private static string[] Participants(Conversation conversation) => [conversation.User1Id, conversation.User2Id];

    private static string? Preview(Message? message) => message switch
    {
        null => null,
        { Text.Length: > 0 } => message.Text,
        { ImageUrl: not null } => MessagingRules.ImageFallbackText,
        _ => string.Empty
    };

    private static ChatMessage ToChatMessage(Message message) => new(
        message.Id,
        message.ConversationId,
        message.SenderId,
        message.Text,
        message.ImageUrl,
        message.IsRead,
        message.SentAt);
}
