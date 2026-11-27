using Microsoft.EntityFrameworkCore;
using Tracet.Application.Abstractions;
using Tracet.Domain.Entities;
using Tracet.Domain.Enums;

namespace Tracet.Infrastructure.Persistence;

public class AppDbContext : DbContext, IAppDbContext
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
    public DbSet<BlockedUser> BlockedUsers => Set<BlockedUser>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<LocationTag>()
            .HasKey(lt => new { lt.LocationId, lt.TagId });

        modelBuilder.Entity<Pin>()
            .HasIndex(p => new { p.UserId, p.CreatedAt })
            .IsDescending();
        
        modelBuilder.Entity<Pin>()
            .HasIndex(p => new { p.UserId, p.VisitedAt })
            .IsDescending();

        modelBuilder.Entity<Pin>()
            .HasIndex(p => p.LocationId);

        modelBuilder.Entity<Location>()
            .HasIndex(l => new { l.Latitude, l.Longitude });

        modelBuilder.Entity<Conversation>()
            .HasIndex(c => c.User1Id);
        
        modelBuilder.Entity<Conversation>()
            .HasIndex(c => c.User2Id);

        modelBuilder.Entity<Message>()
            .HasIndex(m => new { m.ConversationId, m.SentAt })
            .IsDescending();

        modelBuilder.Entity<Friendship>()
            .HasIndex(f => new { f.UserId, f.Status });
        
        modelBuilder.Entity<Friendship>()
            .HasIndex(f => new { f.FriendId, f.Status });

        modelBuilder.Entity<AIChatHistory>()
            .HasIndex(h => new { h.UserId, h.Provider, h.Timestamp })
            .IsDescending();

        modelBuilder.Entity<Friendship>()
            .Property(f => f.Status)
            .HasConversion(
                status => status.ToString(),
                value => Enum.Parse<FriendshipStatus>(value, true));

        modelBuilder.Entity<Friendship>()
            .HasOne(f => f.User)
            .WithMany()
            .HasForeignKey(f => f.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Friendship>()
            .HasOne(f => f.Friend)
            .WithMany()
            .HasForeignKey(f => f.FriendId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BlockedUser>()
            .HasOne(b => b.Blocker)
            .WithMany()
            .HasForeignKey(b => b.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<BlockedUser>()
            .HasOne(b => b.Blocked)
            .WithMany()
            .HasForeignKey(b => b.BlockedUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Tag>().HasData(
            new Tag { Id = 1, Name = "Nightlife" },
            new Tag { Id = 2, Name = "Romantic" },
            new Tag { Id = 3, Name = "Hidden Gem" },
            new Tag { Id = 4, Name = "Family-Friendly" },
            new Tag { Id = 5, Name = "Quiet & Relaxing" },
            new Tag { Id = 6, Name = "Historical" },
            new Tag { Id = 7, Name = "Scenic View" },
            new Tag { Id = 8, Name = "Food & Drinks" },
            new Tag { Id = 9, Name = "Nature & Beach" },
            new Tag { Id = 10, Name = "Budget-Friendly" },
            new Tag { Id = 11, Name = "Culture & Art" },
            new Tag { Id = 12, Name = "Adventure" }
        );

        modelBuilder.Entity<Location>().HasData(
            new Location { Id = 7, PlaceName = "Tokyo Tower", CityName = "Tokyo", CountryName = "Japan", Latitude = 35.6586, Longitude = 139.7454 },
            new Location { Id = 8, PlaceName = "Central Park", CityName = "New York", CountryName = "USA", Latitude = 40.7829, Longitude = -73.9654 },
            new Location { Id = 9, PlaceName = "Sagrada Familia", CityName = "Barcelona", CountryName = "Spain", Latitude = 41.4036, Longitude = 2.1744 },
            new Location { Id = 10, PlaceName = "Sydney Opera House", CityName = "Sydney", CountryName = "Australia", Latitude = -33.8568, Longitude = 151.2153 },
            new Location { Id = 11, PlaceName = "Machu Picchu", CityName = "Cusco", CountryName = "Peru", Latitude = -13.1631, Longitude = -72.5450 },
            new Location { Id = 12, PlaceName = "Santorini", CityName = "Santorini", CountryName = "Greece", Latitude = 36.3932, Longitude = 25.4615 },
            new Location { Id = 13, PlaceName = "Bangkok", CityName = "Bangkok", CountryName = "Thailand", Latitude = 13.7563, Longitude = 100.5018 },
            new Location { Id = 14, PlaceName = "Lisbon", CityName = "Lisbon", CountryName = "Portugal", Latitude = 38.7223, Longitude = -9.1393 },
            new Location { Id = 15, PlaceName = "Cape Town", CityName = "Cape Town", CountryName = "South Africa", Latitude = -33.9249, Longitude = 18.4241 },
            new Location { Id = 16, PlaceName = "Reykjavik", CityName = "Reykjavik", CountryName = "Iceland", Latitude = 64.1466, Longitude = -21.9426 }
        );

        modelBuilder.Entity<LocationTag>().HasData(
            new LocationTag { LocationId = 7, TagId = 11, TagCount = 3 },
            new LocationTag { LocationId = 7, TagId = 8, TagCount = 4 },
            new LocationTag { LocationId = 7, TagId = 1, TagCount = 2 },
            new LocationTag { LocationId = 7, TagId = 12, TagCount = 2 },
            new LocationTag { LocationId = 8, TagId = 9, TagCount = 4 },
            new LocationTag { LocationId = 8, TagId = 5, TagCount = 3 },
            new LocationTag { LocationId = 8, TagId = 4, TagCount = 2 },
            new LocationTag { LocationId = 8, TagId = 7, TagCount = 3 },
            new LocationTag { LocationId = 9, TagId = 6, TagCount = 5 },
            new LocationTag { LocationId = 9, TagId = 11, TagCount = 4 },
            new LocationTag { LocationId = 9, TagId = 7, TagCount = 2 },
            new LocationTag { LocationId = 9, TagId = 3, TagCount = 3 },
            new LocationTag { LocationId = 10, TagId = 11, TagCount = 4 },
            new LocationTag { LocationId = 10, TagId = 7, TagCount = 5 },
            new LocationTag { LocationId = 10, TagId = 6, TagCount = 2 },
            new LocationTag { LocationId = 10, TagId = 2, TagCount = 3 },
            new LocationTag { LocationId = 11, TagId = 12, TagCount = 5 },
            new LocationTag { LocationId = 11, TagId = 6, TagCount = 4 },
            new LocationTag { LocationId = 11, TagId = 9, TagCount = 3 },
            new LocationTag { LocationId = 11, TagId = 7, TagCount = 4 },
            new LocationTag { LocationId = 12, TagId = 2, TagCount = 5 },
            new LocationTag { LocationId = 12, TagId = 7, TagCount = 5 },
            new LocationTag { LocationId = 12, TagId = 8, TagCount = 3 },
            new LocationTag { LocationId = 12, TagId = 5, TagCount = 2 },
            new LocationTag { LocationId = 13, TagId = 8, TagCount = 5 },
            new LocationTag { LocationId = 13, TagId = 1, TagCount = 4 },
            new LocationTag { LocationId = 13, TagId = 10, TagCount = 3 },
            new LocationTag { LocationId = 13, TagId = 11, TagCount = 2 },
            new LocationTag { LocationId = 14, TagId = 3, TagCount = 4 },
            new LocationTag { LocationId = 14, TagId = 8, TagCount = 3 },
            new LocationTag { LocationId = 14, TagId = 6, TagCount = 3 },
            new LocationTag { LocationId = 14, TagId = 2, TagCount = 2 },
            new LocationTag { LocationId = 15, TagId = 12, TagCount = 4 },
            new LocationTag { LocationId = 15, TagId = 9, TagCount = 5 },
            new LocationTag { LocationId = 15, TagId = 7, TagCount = 3 },
            new LocationTag { LocationId = 15, TagId = 10, TagCount = 2 },
            new LocationTag { LocationId = 16, TagId = 9, TagCount = 4 },
            new LocationTag { LocationId = 16, TagId = 12, TagCount = 4 },
            new LocationTag { LocationId = 16, TagId = 3, TagCount = 3 },
            new LocationTag { LocationId = 16, TagId = 5, TagCount = 3 }
        );
    }
}