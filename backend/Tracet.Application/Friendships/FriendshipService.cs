using Microsoft.EntityFrameworkCore;
using Tracet.Application.Abstractions;
using Tracet.Application.Common;
using Tracet.Application.Conversations;
using Tracet.Domain.Entities;
using Tracet.Domain.Enums;

namespace Tracet.Application.Friendships;

public sealed class FriendshipService(IAppDbContext db) : IFriendshipService
{
    private const int MaxSearchResults = 20;

    public async Task<IReadOnlyList<UserSearchResult>> SearchUsersAsync(
        string userId, string? query, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(query)) return [];

        var prefix = query.Trim().ToLower();
        var users = await db.Users
            .Where(u => u.Id != userId &&
                        (u.Username.ToLower().StartsWith(prefix) || u.DisplayName.ToLower().StartsWith(prefix)))
            .Take(MaxSearchResults)
            .ToListAsync(cancellationToken);

        var friendships = await db.Friendships
            .Where(FriendshipQueries.Involving(userId))
            .ToListAsync(cancellationToken);

        return users
            .Select(u => new UserSearchResult(
                u.Id,
                u.Username,
                u.PublicName,
                u.PhotoUrl,
                RelationshipTo(userId, friendships.FirstOrDefault(f => f.UserId == u.Id || f.FriendId == u.Id))))
            .ToList();
    }

    public async Task<SocialOverview> GetSocialOverviewAsync(
        string userId, PageRequest page, CancellationToken cancellationToken = default)
    {
        var friendships = await db.Friendships
            .Include(f => f.User)
            .Include(f => f.Friend)
            .Where(FriendshipQueries.Involving(userId))
            .ToListAsync(cancellationToken);

        var entries = friendships
            .Select(f => (Friendship: f, Other: f.UserId == userId ? f.Friend : f.User))
            .Where(e => e.Other is not null)
            .ToList();

        SocialUser ToSocialUser((Friendship Friendship, User? Other) e) =>
            new(e.Other!.Id, e.Friendship.UserId, e.Other.Username, e.Other.PublicName, e.Other.PhotoUrl);

        var friends = entries.Where(e => e.Friendship.Status == FriendshipStatus.Accepted).Select(ToSocialUser).ToList();
        var pending = entries.Where(e => e.Friendship.Status == FriendshipStatus.Pending).ToList();

        return new SocialOverview(
            friends.Page(page).ToList(),
            pending.Where(e => e.Friendship.FriendId == userId).Select(ToSocialUser).ToList(),
            pending.Where(e => e.Friendship.UserId == userId).Select(ToSocialUser).ToList(),
            Pagination.Create(page, friends.Count));
    }

    public async Task<PendingFriendRequests> GetPendingRequestsAsync(
        string userId, PageRequest page, CancellationToken cancellationToken = default)
    {
        var (requests, pagination) = await db.Friendships
            .Include(f => f.User)
            .Where(f => f.FriendId == userId && f.Status == FriendshipStatus.Pending)
            .OrderByDescending(f => f.RequestedAt)
            .ToPageAsync(page, cancellationToken);

        var items = requests
            .Select(f => new PendingFriendRequest(f.Id, f.UserId, f.User!.Username, f.User.PublicName, f.User.PhotoUrl))
            .ToList();

        return new PendingFriendRequests(pagination.TotalItems, items, pagination);
    }

    public async Task<Result> SendRequestAsync(
        string senderId, string receiverId, CancellationToken cancellationToken = default)
    {
        if (senderId == receiverId)
            return Error.Validation("You cannot send a friend request to yourself.");

        if (!await db.Users.AnyAsync(u => u.Id == receiverId, cancellationToken))
            return Error.NotFound("User not found.");

        var existing = await db.Friendships
            .FirstOrDefaultAsync(FriendshipQueries.Between(senderId, receiverId), cancellationToken);

        if (existing is { Status: FriendshipStatus.Pending or FriendshipStatus.Accepted })
            return Error.Validation("An active friend request already exists or you are already friends.");

        var request = existing ?? db.Friendships.Add(new Friendship()).Entity;
        request.UserId = senderId;
        request.FriendId = receiverId;
        request.Status = FriendshipStatus.Pending;
        request.RequestedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result<FriendshipStatus>> RespondAsync(
        string receiverId, string senderId, string action, CancellationToken cancellationToken = default)
    {
        FriendshipStatus? decision = action.Trim().ToLower() switch
        {
            "accept" => FriendshipStatus.Accepted,
            "decline" => FriendshipStatus.Declined,
            _ => null
        };
        if (decision is null)
            return Error.Validation("Action must be 'accept' or 'decline'.");

        var request = await db.Friendships.FirstOrDefaultAsync(
            f => f.UserId == senderId && f.FriendId == receiverId && f.Status == FriendshipStatus.Pending,
            cancellationToken);
        if (request is null)
            return Error.NotFound("Friend request not found or already processed.");

        request.Status = decision.Value;

        if (decision == FriendshipStatus.Accepted)
            await db.GetOrAddConversationAsync(receiverId, senderId, cancellationToken);

        await db.SaveChangesAsync(cancellationToken);
        return decision.Value;
    }

    private static string RelationshipTo(string userId, Friendship? friendship) => friendship switch
    {
        { Status: FriendshipStatus.Accepted } => "friends",
        { Status: FriendshipStatus.Pending } f when f.UserId == userId => "pending_sent",
        { Status: FriendshipStatus.Pending } => "pending_received",
        _ => "none"
    };
}
