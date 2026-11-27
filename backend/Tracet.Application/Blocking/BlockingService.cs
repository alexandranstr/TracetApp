using Microsoft.EntityFrameworkCore;
using Tracet.Application.Abstractions;
using Tracet.Application.Common;
using Tracet.Application.Social;
using Tracet.Domain.Entities;

namespace Tracet.Application.Blocking;

public sealed class BlockingService(IAppDbContext db, ISocialGraph socialGraph) : IBlockingService
{
    public async Task<Result> BlockAsync(string userId, string targetUserId, CancellationToken cancellationToken = default)
    {
        if (userId == targetUserId)
            return Error.Validation("You cannot block yourself.");

        if (!await db.Users.AnyAsync(u => u.Id == targetUserId, cancellationToken))
            return Error.NotFound("User not found.");

        if (await socialGraph.HasBlockedAsync(userId, targetUserId, cancellationToken))
            return Error.Validation("User is already blocked.");

        db.BlockedUsers.Add(new BlockedUser
        {
            UserId = userId,
            BlockedUserId = targetUserId,
            BlockedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result> UnblockAsync(string userId, string targetUserId, CancellationToken cancellationToken = default)
    {
        var block = await db.BlockedUsers
            .FirstOrDefaultAsync(b => b.UserId == userId && b.BlockedUserId == targetUserId, cancellationToken);
        if (block is null)
            return Error.NotFound("User is not blocked.");

        db.BlockedUsers.Remove(block);
        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<BlockStatus> GetStatusAsync(string userId, string otherUserId, CancellationToken cancellationToken = default) =>
        new(await socialGraph.HasBlockedAsync(userId, otherUserId, cancellationToken),
            await socialGraph.HasBlockedAsync(otherUserId, userId, cancellationToken));

    public async Task<BlockedUsersPage> GetBlockedUsersAsync(string userId, PageRequest page, CancellationToken cancellationToken = default)
    {
        var (blocks, pagination) = await db.BlockedUsers
            .Include(b => b.Blocked)
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.BlockedAt)
            .ToPageAsync(page, cancellationToken);

        var items = blocks
            .Select(b => new BlockedUserItem(
                b.BlockedUserId,
                b.Blocked?.Username ?? string.Empty,
                b.Blocked?.PublicName ?? string.Empty,
                b.Blocked?.PhotoUrl,
                b.BlockedAt))
            .ToList();

        return new BlockedUsersPage(items, pagination);
    }
}
