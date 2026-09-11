namespace Tracet.models;

public class Friendship
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;
    public string FriendId { get; set; } = string.Empty;
    public User Friend { get; set; } = null!;
    public string Status { get; set; } = "Pending"; 
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
}