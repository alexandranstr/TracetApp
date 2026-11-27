using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using Tracet.data;
using Tracet.models;

namespace Tracet.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
[EnableRateLimiting("global")]
public class FriendshipsController : ControllerBase
{
    private readonly AppDbContext _context;

    public FriendshipsController(AppDbContext context)
    {
        _context = context;
    }

    private string CurrentUserId => User.FindFirstValue("user_id")
        ?? throw new InvalidOperationException("Authenticated user has no user_id claim.");

    [HttpGet("search")]
    public async Task<IActionResult> SearchUsers([FromQuery] string q)
    {
        var currentUserId = CurrentUserId;

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
    public async Task<IActionResult> GetSocialOverview([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var userId = CurrentUserId;

        page = Math.Max(1, page);
        pageSize = Math.Max(1, Math.Min(100, pageSize));

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

        // Paginate friends list
        var totalFriends = friends.Count;
        var totalPages = (int)Math.Ceiling((double)totalFriends / pageSize);
        var paginatedFriends = friends.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return Ok(new
        {
            friends = paginatedFriends,
            incomingRequests,
            outgoingRequests,
            pagination = new
            {
                currentPage = page,
                pageSize,
                totalFriends,
                totalPages,
                hasPreviousPage = page > 1,
                hasNextPage = page < totalPages
            }
        });
    }

    [HttpGet("requests")]
    public async Task<IActionResult> GetPendingRequests([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = CurrentUserId;

        page = Math.Max(1, page);
        pageSize = Math.Max(1, Math.Min(50, pageSize));

        var query = _context.Friendships
            .Include(f => f.User)
            .Where(f => f.FriendId == userId && (f.Status == "Pending" || f.Status == "pending"));

        var totalRequests = await query.CountAsync();
        var totalPages = (int)Math.Ceiling((double)totalRequests / pageSize);

        var pendingRequests = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
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
            count = totalRequests,
            requests = pendingRequests,
            pagination = new
            {
                currentPage = page,
                pageSize,
                totalRequests,
                totalPages,
                hasPreviousPage = page > 1,
                hasNextPage = page < totalPages
            }
        });
    }

    [HttpPost("request")]
    public async Task<IActionResult> SendRequest([FromBody] SendFriendRequestDto dto)
    {
        var senderId = CurrentUserId;

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
        var currentUserId = CurrentUserId;

        var action = dto.Action?.Trim().ToLower();
        if (action != "accept" && action != "decline")
            return BadRequest(new { message = "Action must be 'accept' or 'decline'." });

        // Only the RECEIVER of a request may respond to it. Matching the reverse direction
        // would let a sender accept their own outgoing request and force a friendship.
        var request = await _context.Friendships.FirstOrDefaultAsync(f =>
            f.UserId == dto.SenderId &&
            f.FriendId == currentUserId &&
            f.Status.ToLower() == "pending");

        if (request == null)
            return NotFound(new { message = "Friend request not found or already processed." });

        if (action == "accept")
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

        return Ok(new { success = true, message = $"Request successfully {action}ed." });
    }

    [HttpPost("sync-conversations")]
    public async Task<IActionResult> SyncConversations()
    {

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

    [HttpPost("block")]
    public async Task<IActionResult> BlockUser([FromBody] BlockUserDto dto)
    {
        var userId = CurrentUserId;

        if (userId == dto.TargetUserId)
            return BadRequest(new { message = "You cannot block yourself." });

        var targetExists = await _context.Users.AnyAsync(u => u.Id == dto.TargetUserId);
        if (!targetExists)
            return NotFound(new { message = "User not found." });

        // Check if already blocked
        var alreadyBlocked = await _context.BlockedUsers.AnyAsync(b => b.UserId == userId && b.BlockedUserId == dto.TargetUserId);
        if (alreadyBlocked)
            return BadRequest(new { message = "User is already blocked." });

        var block = new BlockedUser
        {
            UserId = userId!,
            BlockedUserId = dto.TargetUserId,
            BlockedAt = DateTime.UtcNow
        };

        _context.BlockedUsers.Add(block);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "User has been blocked." });
    }

    [HttpPost("unblock")]
    public async Task<IActionResult> UnblockUser([FromBody] BlockUserDto dto)
    {
        var userId = CurrentUserId;

        var block = await _context.BlockedUsers.FirstOrDefaultAsync(b => b.UserId == userId && b.BlockedUserId == dto.TargetUserId);
        if (block == null)
            return NotFound(new { message = "User is not blocked." });

        _context.BlockedUsers.Remove(block);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "User has been unblocked." });
    }

    [HttpGet("block-status/{targetUserId}")]
    public async Task<IActionResult> GetBlockStatus(string targetUserId)
    {
        var userId = CurrentUserId;

        var youBlockedThem = await _context.BlockedUsers.AnyAsync(b => b.UserId == userId && b.BlockedUserId == targetUserId);
        var theyBlockedYou = await _context.BlockedUsers.AnyAsync(b => b.BlockedUserId == userId && b.UserId == targetUserId);

        return Ok(new
        {
            youBlockedPartner = youBlockedThem,
            partnerBlockedYou = theyBlockedYou
        });
    }

    [HttpGet("blocked")]
    public async Task<IActionResult> GetBlockedUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = CurrentUserId;

        page = Math.Max(1, page);
        pageSize = Math.Max(1, Math.Min(50, pageSize));

        var query = _context.BlockedUsers
            .Include(b => b.Blocked)
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.BlockedAt);

        var totalBlocked = await query.CountAsync();
        var totalPages = (int)Math.Ceiling((double)totalBlocked / pageSize);

        var blockedUsersData = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var blockedUsers = blockedUsersData.Select(b => new
        {
            b.BlockedUserId,
            Username = b.Blocked?.Username ?? "",
            DisplayName = b.Blocked != null
                ? (string.IsNullOrWhiteSpace(b.Blocked.DisplayName) ? b.Blocked.Username : b.Blocked.DisplayName)
                : "",
            PhotoUrl = b.Blocked?.PhotoUrl,
            b.BlockedAt
        }).ToList();

        return Ok(new
        {
            blockedUsers,
            pagination = new
            {
                currentPage = page,
                pageSize,
                totalBlocked,
                totalPages,
                hasPreviousPage = page > 1,
                hasNextPage = page < totalPages
            }
        });
    }

}

public record SendFriendRequestDto([Required] string ReceiverId);
public record RespondRequestDto([Required] string SenderId, [Required] string Action);
public record BlockUserDto([Required] string TargetUserId);