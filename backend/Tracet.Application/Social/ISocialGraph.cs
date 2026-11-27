namespace Tracet.Application.Social;

public sealed record BlockRelations(IReadOnlySet<string> BlockedByUser, IReadOnlySet<string> BlockingUser)
{
    public IReadOnlyList<string> All => BlockedByUser.Union(BlockingUser).ToList();
}

public interface ISocialGraph
{
    Task<IReadOnlyList<string>> GetFriendIdsAsync(string userId, CancellationToken cancellationToken = default);

    Task<BlockRelations> GetBlockRelationsAsync(string userId, CancellationToken cancellationToken = default);

    Task<bool> AreFriendsAsync(string userId, string otherUserId, CancellationToken cancellationToken = default);

    Task<bool> HasBlockedAsync(string blockerId, string blockedId, CancellationToken cancellationToken = default);
}
