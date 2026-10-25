using FirebaseAdmin.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Tracet.data;
using Tracet.models;

namespace Tracet.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("global")]
public class FriendshipsController : ControllerBase
{
    private readonly AppDbContext _context;

    public FriendshipsController(AppDbContext context)
    {
        _context = context;
    }

    private async Task<(string? Uid, IActionResult? ErrorResult)> ExtractAndVerifyTokenAsync()
    {
        var authHeader = Request.Headers["Authorization"].FirstOrDefault();
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return (null, Unauthorized(new { message = "Missing or invalid Authorization header." }));
        }

        var idToken = authHeader.Substring("Bearer ".Length).Trim();

        try
        {
            FirebaseToken decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);
            return (decodedToken.Uid, null);
        }
        catch (FirebaseAuthException ex)
        {
            return (null, Unauthorized(new { message = "Invalid or expired token.", error = ex.Message }));
        }
        catch (Exception ex)
        {
            return (null, StatusCode(500, new { message = "Authentication error.", error = ex.Message }));
        }
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchUsers([FromQuery] string q)
    {
        var (currentUserId, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

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
    public async Task<IActionResult> GetSocialOverview()
    {
        var (userId, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

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
    public async Task<IActionResult> GetPendingRequests()
    {
        var (userId, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        var pendingRequests = await _context.Friendships
            .Include(f => f.User)
            .Where(f => f.FriendId == userId && (f.Status == "Pending" || f.Status == "pending"))
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
    public async Task<IActionResult> SendRequest([FromBody] SendFriendRequestDto dto)
    {
        var (senderId, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        if (senderId == dto.ReceiverId)
        {
            return BadRequest(new { message = "You cannot send a friend request to yourself." });
        }
        
        var receiverExists = await _context.Users.AnyAsync(u => u.Id == dto.ReceiverId);
        if (!receiverExists)
        {
            return NotFound(new { message = "User not found." });
        }

        var existing = await _context.Friendships.FirstOrDefaultAsync(f =>
            (f.UserId == senderId && f.FriendId == dto.ReceiverId) ||
            (f.UserId == dto.ReceiverId && f.FriendId == senderId));

        if (existing != null)
        {
            var statusLower = existing.Status.ToLower();
            if (statusLower == "pending" || statusLower == "accepted")
            {
                return BadRequest(new { message = "An active friend request already exists or you are already friends." });
            }

            existing.UserId = senderId;
            existing.FriendId = dto.ReceiverId;
            existing.Status = "Pending";
            existing.RequestedAt = DateTime.UtcNow;

            _context.Friendships.Update(existing);
        }
        else
        {
            var friendship = new Friendship
            {
                UserId = senderId,
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
    public async Task<IActionResult> RespondToRequest([FromBody] RespondRequestDto dto)
    {
        var (currentUserId, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        var request = await _context.Friendships.FirstOrDefaultAsync(f =>
            ((f.UserId == dto.SenderId && f.FriendId == currentUserId) ||
             (f.UserId == currentUserId && f.FriendId == dto.SenderId)) && 
            f.Status.ToLower() == "pending");

        if (request == null) 
            return NotFound(new { message = "Friend request not found or already processed." });

        if (dto.Action.ToLower() == "accept")
        {
            request.Status = "Accepted";

            var existingConv = await _context.Conversations.FirstOrDefaultAsync(c =>
                (c.User1Id == dto.SenderId && c.User2Id == currentUserId) ||
                (c.User1Id == currentUserId && c.User2Id == dto.SenderId));

            if (existingConv == null)
            {
                var newConv = new Conversation
                {
                    User1Id = currentUserId,
                    User2Id = dto.SenderId,
                    LastMessage = "",
                    LastMessageAt = DateTime.UtcNow
                };

                _context.Conversations.Add(newConv);
            }
        }
        else
        {
            request.Status = "Declined";
        }

        _context.Friendships.Update(request);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = $"Request successfully {dto.Action.ToLower()}ed." });
    }

    [HttpPost("sync-conversations")]
    public async Task<IActionResult> SyncConversations()
    {
        var (_, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        var acceptedFriendships = await _context.Friendships
            .Where(f => f.Status.ToLower() == "accepted")
            .ToListAsync();

        var existingConversations = await _context.Conversations.ToListAsync();
        int addedCount = 0;

        foreach (var f in acceptedFriendships)
        {
            bool exists = existingConversations.Any(c =>
                (c.User1Id == f.UserId && c.User2Id == f.FriendId) ||
                (c.User1Id == f.FriendId && c.User2Id == f.UserId));

            if (!exists)
            {
                var newConv = new Conversation
                {
                    User1Id = f.UserId,
                    User2Id = f.FriendId,
                    LastMessage = "",
                    LastMessageAt = DateTime.UtcNow
                };
                _context.Conversations.Add(newConv);
                existingConversations.Add(newConv);
                addedCount++;
            }
        }

        if (addedCount > 0)
        {
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = $"Synchronized successfully. Created {addedCount} conversations." });
    }
}

public record SendFriendRequestDto(string ReceiverId);
public record RespondRequestDto(string SenderId, string Action);