using Tracet.Domain.Entities;
using Tracet.Domain.Enums;

namespace Tracet.Tests.Infrastructure;

// Unique ids keep tests independent while they share one database per test class.
public static class TestData
{
    public static string NewUserId(string name) => $"{name}-{Guid.NewGuid():N}";

    public static async Task<string> CreateUserAsync(this TracetApiFactory api, string name)
    {
        var id = NewUserId(name);
        await api.WithDbAsync(async db =>
        {
            db.Users.Add(new User
            {
                Id = id,
                Email = $"{id}@test.local",
                DisplayName = name,
                Username = id.ToLowerInvariant(),
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        });
        return id;
    }

    public static async Task MakeFriendsAsync(this TracetApiFactory api, string userId, string friendId)
    {
        await api.WithDbAsync(async db =>
        {
            db.Friendships.Add(new Friendship
            {
                UserId = userId,
                FriendId = friendId,
                Status = FriendshipStatus.Accepted,
                RequestedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        });
    }
}
