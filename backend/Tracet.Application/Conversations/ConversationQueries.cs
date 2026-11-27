using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Tracet.Application.Abstractions;
using Tracet.Domain.Entities;

namespace Tracet.Application.Conversations;

public static class ConversationQueries
{
    public static Expression<Func<Conversation, bool>> Involving(string userId) =>
        c => c.User1Id == userId || c.User2Id == userId;

    public static Expression<Func<Conversation, bool>> Between(string userId, string otherUserId) =>
        c => (c.User1Id == userId && c.User2Id == otherUserId) ||
             (c.User1Id == otherUserId && c.User2Id == userId);

    public static async Task<Conversation> GetOrAddConversationAsync(
        this IAppDbContext db, string userId, string otherUserId, CancellationToken cancellationToken = default) =>
        await db.Conversations.FirstOrDefaultAsync(Between(userId, otherUserId), cancellationToken)
        ?? db.Conversations.Add(new Conversation
        {
            User1Id = userId,
            User2Id = otherUserId,
            LastMessage = string.Empty,
            LastMessageAt = DateTime.UtcNow
        }).Entity;
}
