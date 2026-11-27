using System.Linq.Expressions;
using Tracet.Domain.Entities;

namespace Tracet.Application.Friendships;

public static class FriendshipQueries
{
    public static Expression<Func<Friendship, bool>> Involving(string userId) =>
        f => f.UserId == userId || f.FriendId == userId;

    public static Expression<Func<Friendship, bool>> Between(string userId, string otherUserId) =>
        f => (f.UserId == userId && f.FriendId == otherUserId) ||
             (f.UserId == otherUserId && f.FriendId == userId);
}
