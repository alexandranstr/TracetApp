using Tracet.Application.Common;

namespace Tracet.Application.Blocking;

public interface IBlockingService
{
    Task<Result> BlockAsync(string userId, string targetUserId, CancellationToken cancellationToken = default);

    Task<Result> UnblockAsync(string userId, string targetUserId, CancellationToken cancellationToken = default);

    Task<BlockStatus> GetStatusAsync(string userId, string otherUserId, CancellationToken cancellationToken = default);

    Task<BlockedUsersPage> GetBlockedUsersAsync(string userId, PageRequest page, CancellationToken cancellationToken = default);
}
