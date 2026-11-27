using Microsoft.EntityFrameworkCore;
using Tracet.Application.Abstractions;
using Tracet.Application.Friendships;
using Tracet.Domain.Enums;

namespace Tracet.Application.Social;

public sealed class SocialGraph(IAppDbContext db) : ISocialGraph
{
    public async Task<IReadOnlyList<string>> GetFriendIdsAsync(string userId, CancellationToken cancellationToken = default) =>
        await db.Friendships
            .Where(FriendshipQueries.Involving(userId))
            .Where(f => f.Status == FriendshipStatus.Accepted)
            .Select(f => f.UserId == userId ? f.FriendId : f.UserId)
            .ToListAsync(cancellationToken);

    public async Task<BlockRelations> GetBlockRelationsAsync(string userId, CancellationToken cancellationToken = default)
    {
        var blocks = await db.BlockedUsers
            .Where(b => b.UserId == userId || b.BlockedUserId == userId)
            .ToListAsync(cancellationToken);

        return new BlockRelations(
            blocks.Where(b => b.UserId == userId).Select(b => b.BlockedUserId).ToHashSet(),
            blocks.Where(b => b.BlockedUserId == userId).Select(b => b.UserId).ToHashSet());
    }

    public Task<bool> AreFriendsAsync(string userId, string otherUserId, CancellationToken cancellationToken = default) =>
        db.Friendships
            .Where(FriendshipQueries.Between(userId, otherUserId))
            .AnyAsync(f => f.Status == FriendshipStatus.Accepted, cancellationToken);

    public Task<bool> HasBlockedAsync(string blockerId, string blockedId, CancellationToken cancellationToken = default) =>
        db.BlockedUsers.AnyAsync(b => b.UserId == blockerId && b.BlockedUserId == blockedId, cancellationToken);
}
