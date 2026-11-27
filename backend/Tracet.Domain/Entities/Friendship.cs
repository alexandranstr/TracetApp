using Tracet.Domain.Enums;

namespace Tracet.Domain.Entities;

public class Friendship
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public User? User { get; set; }
    public string FriendId { get; set; } = string.Empty;
    public User? Friend { get; set; }
    public FriendshipStatus Status { get; set; } = FriendshipStatus.Pending;
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
}