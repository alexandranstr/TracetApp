using Microsoft.EntityFrameworkCore;
using Tracet.models;

namespace Tracet.data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Friendship> Friendships => Set<Friendship>();
    public DbSet<Pin> Pins => Set<Pin>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<LocationTag> LocationTags => Set<LocationTag>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<AIChatHistory> AIChatHistories => Set<AIChatHistory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<LocationTag>()
            .HasKey(lt => new { lt.LocationId, lt.TagId });

        modelBuilder.Entity<Tag>().HasData(
            new Tag { Id = 1, Name = "Quiet" },
            new Tag { Id = 2, Name = "Scenic" },
            new Tag { Id = 3, Name = "Nightlife" },
            new Tag { Id = 4, Name = "Beach" },
            new Tag { Id = 5, Name = "Countryside" },
            new Tag { Id = 6, Name = "Historic" },
            new Tag { Id = 7, Name = "Budget-Friendly" },
            new Tag { Id = 8, Name = "Family-Friendly" }
        );
    }
}