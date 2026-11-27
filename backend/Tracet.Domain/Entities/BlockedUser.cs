namespace Tracet.Domain.Entities;

public class BlockedUser
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public User? Blocker { get; set; }
    public string BlockedUserId { get; set; } = string.Empty;
    public User? Blocked { get; set; }
    public DateTime BlockedAt { get; set; } = DateTime.UtcNow;
}
