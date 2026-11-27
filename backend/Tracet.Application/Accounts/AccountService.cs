using Microsoft.EntityFrameworkCore;
using Tracet.Application.Abstractions;
using Tracet.Application.Common;
using Tracet.Application.Conversations;
using Tracet.Application.Friendships;

namespace Tracet.Application.Accounts;

public interface IAccountService
{
    Task<Result> DeleteAsync(string userId, CancellationToken cancellationToken = default);
}

public sealed class AccountService(IAppDbContext db, IFileStorage storage, IIdentityProvider identity) : IAccountService
{
    public async Task<Result> DeleteAsync(string userId, CancellationToken cancellationToken = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null)
            return Error.NotFound("User not found.");

        var pins = await db.Pins.Where(p => p.UserId == userId).ToListAsync(cancellationToken);
        var sentMessages = await db.Messages.Where(m => m.SenderId == userId).ToListAsync(cancellationToken);
        var files = pins
            .SelectMany(p => JsonList.Parse<string>(p.PhotoUrlsJson))
            .Concat(sentMessages.Select(m => m.ImageUrl).OfType<string>())
            .Where(url => !string.IsNullOrWhiteSpace(url))
            .Distinct()
            .ToList();

        db.AIChatHistories.RemoveRange(db.AIChatHistories.Where(h => h.UserId == userId));
        db.Pins.RemoveRange(pins);
        db.Messages.RemoveRange(sentMessages);
        db.Conversations.RemoveRange(db.Conversations.Where(ConversationQueries.Involving(userId)));
        db.Friendships.RemoveRange(db.Friendships.Where(FriendshipQueries.Involving(userId)));
        db.BlockedUsers.RemoveRange(db.BlockedUsers.Where(b => b.UserId == userId || b.BlockedUserId == userId));
        db.Users.Remove(user);
        await db.SaveChangesAsync(cancellationToken);

        foreach (var file in files)
            await storage.DeleteUserFileAsync(userId, file, cancellationToken);
        await identity.DeleteUserAsync(userId, cancellationToken);

        return Result.Success();
    }
}
