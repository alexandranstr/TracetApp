using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tracet.data;
using Tracet.models;

namespace Tracet.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FriendshipsController : ControllerBase
{
    private readonly AppDbContext _context;

    public FriendshipsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchUsers([FromQuery] string q, [FromQuery] string currentUserId)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 1) 
            return Ok(new List<object>());

        var searchLower = q.Trim().ToLower();

        var users = await _context.Users
            .Where(u => u.Id != currentUserId && 
                       (u.Username.ToLower().StartsWith(searchLower) || 
                       (u.DisplayName != null && u.DisplayName.ToLower().StartsWith(searchLower))))
            .Select(u => new
            {
                u.Id,
                u.Username,
                u.DisplayName,
                u.PhotoUrl
            })
            .Take(20)
            .ToListAsync();

        var existingFriendships = await _context.Friendships
            .Where(f => f.UserId == currentUserId || f.FriendId == currentUserId)
            .ToListAsync();

        var results = users.Select(u =>
        {
            var rel = existingFriendships.FirstOrDefault(f => 
                (f.UserId == currentUserId && f.FriendId == u.Id) || 
                (f.FriendId == currentUserId && f.UserId == u.Id));

            string status = "none";
            if (rel != null)
            {
                var relStatus = rel.Status.ToLower();

                if (relStatus == "accepted")
                {
                    status = "friends";
                }
                else if (relStatus == "pending")
                {
                    status = rel.UserId == currentUserId ? "pending_sent" : "pending_received";
                }
            }

            return new
            {
                u.Id,
                u.Username,
                DisplayName = string.IsNullOrWhiteSpace(u.DisplayName) ? u.Username : u.DisplayName,
                u.PhotoUrl,
                Status = status
            };
        });

        return Ok(results);
    }

    [HttpGet("social-overview")]
    public async Task<IActionResult> GetSocialOverview([FromQuery] string userId)
    {
        if (string.IsNullOrEmpty(userId))
            return BadRequest(new { message = "User ID is required." });

        var friendships = await _context.Friendships
            .Where(f => f.UserId == userId || f.FriendId == userId)
            .Select(f => new
            {
                f.UserId,
                f.FriendId,
                f.Status,
                OtherUser = f.UserId == userId ? f.Friend : f.User
            })
            .ToListAsync();

        var friends = new List<object>();
        var incomingRequests = new List<object>();
        var outgoingRequests = new List<object>();

        foreach (var f in friendships)
        {
            if (f.OtherUser == null) continue;

            bool isSender = f.UserId == userId;

            var userObj = new
            {
                id = f.OtherUser.Id,
                senderId = f.UserId,
                username = f.OtherUser.Username,
                displayName = string.IsNullOrWhiteSpace(f.OtherUser.DisplayName) ? f.OtherUser.Username : f.OtherUser.DisplayName,
                photoUrl = f.OtherUser.PhotoUrl
            };

            var statusLower = f.Status.ToLower();

            if (statusLower == "accepted")
            {
                friends.Add(userObj);
            }
            else if (statusLower == "pending")
            {
                if (isSender)
                {
                    outgoingRequests.Add(userObj);
                }
                else
                {
                    incomingRequests.Add(userObj);
                }
            }
        }

        return Ok(new
        {
            friends,
            incomingRequests,
            outgoingRequests
        });
    }

    [HttpGet("requests")]
    public async Task<IActionResult> GetPendingRequests([FromQuery] string userId)
    {
        var pendingRequests = await _context.Friendships
            .Include(f => f.User)
            .Where(f => f.FriendId == userId && f.Status == "Pending")
            .Select(f => new
            {
                f.Id,
                SenderId = f.UserId,
                Username = f.User.Username,
                DisplayName = string.IsNullOrWhiteSpace(f.User.DisplayName) ? f.User.Username : f.User.DisplayName,
                PhotoUrl = f.User.PhotoUrl
            })
            .ToListAsync();

        return Ok(new
        {
            count = pendingRequests.Count,
            requests = pendingRequests
        });
    }

    [HttpPost("request")]
    public async Task<IActionResult> SendRequest([FromBody] FriendRequestDto dto)
    {
        if (dto.SenderId == dto.ReceiverId)
        {
            return BadRequest(new { message = "You cannot send a friend request to yourself." });
        }

        var existing = await _context.Friendships.FirstOrDefaultAsync(f =>
            (f.UserId == dto.SenderId && f.FriendId == dto.ReceiverId) ||
            (f.UserId == dto.ReceiverId && f.FriendId == dto.SenderId));

        if (existing != null)
        {
            var statusLower = existing.Status.ToLower();
            if (statusLower == "pending" || statusLower == "accepted")
            {
                return BadRequest(new { message = "An active friend request already exists or you are already friends." });
            }

            existing.UserId = dto.SenderId;
            existing.FriendId = dto.ReceiverId;
            existing.Status = "Pending";
            existing.RequestedAt = DateTime.UtcNow;

            _context.Friendships.Update(existing);
        }
        else
        {
            var friendship = new Friendship
            {
                UserId = dto.SenderId,
                FriendId = dto.ReceiverId,
                Status = "Pending",
                RequestedAt = DateTime.UtcNow
            };

            _context.Friendships.Add(friendship);
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Friend request sent successfully." });
    }

    [HttpPost("respond")]
    public async Task<IActionResult> RespondToRequest([FromBody] RespondDto dto)
    {
        var request = await _context.Friendships.FirstOrDefaultAsync(f =>
            f.UserId == dto.SenderId && f.FriendId == dto.CurrentUserId && f.Status == "Pending");

        if (request == null) 
            return NotFound(new { message = "Friend request not found." });

        if (dto.Action.ToLower() == "accept")
        {
            request.Status = "Accepted";
        }
        else
        {
            request.Status = "Declined";
        }

        _context.Friendships.Update(request);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = $"Request successfully {dto.Action.ToLower()}ed." });
    }
}

public record FriendRequestDto(string SenderId, string ReceiverId);
public record RespondDto(string CurrentUserId, string SenderId, string Action);