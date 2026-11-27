using Microsoft.EntityFrameworkCore;
using Tracet.Domain.Entities;

namespace Tracet.Application.Abstractions;

public interface IAppDbContext
{
    DbSet<User> Users { get; }
    DbSet<Friendship> Friendships { get; }
    DbSet<Pin> Pins { get; }
    DbSet<Location> Locations { get; }
    DbSet<Tag> Tags { get; }
    DbSet<LocationTag> LocationTags { get; }
    DbSet<Conversation> Conversations { get; }
    DbSet<Message> Messages { get; }
    DbSet<AIChatHistory> AIChatHistories { get; }
    DbSet<BlockedUser> BlockedUsers { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
