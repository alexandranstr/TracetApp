using FirebaseAdmin.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Tracet.data;
using Tracet.hubs;
using Tracet.models;

namespace Tracet.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("global")]
public class MessagesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly IWebHostEnvironment _environment;

    public MessagesController(AppDbContext context, IHubContext<ChatHub> hubContext, IWebHostEnvironment environment)
    {
        _context = context;
        _hubContext = hubContext;
        _environment = environment;
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

    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations([FromQuery] string? q = null)
    {
        var (userId, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        try
        {
            var conversations = await _context.Conversations
                .Where(c => c.User1Id == userId || c.User2Id == userId)
                .OrderByDescending(c => c.LastMessageAt)
                .ToListAsync();

            var resultList = new List<object>();

            foreach (var conv in conversations)
            {
                var partnerId = conv.User1Id == userId ? conv.User2Id : conv.User1Id;
                if (string.IsNullOrEmpty(partnerId)) continue;

                var partner = await _context.Users.FindAsync(partnerId);
                if (partner == null) continue;

                if (!string.IsNullOrWhiteSpace(q))
                {
                    var searchLower = q.Trim().ToLower();
                    bool matches = (partner.Username != null && partner.Username.ToLower().StartsWith(searchLower)) ||
                                   (partner.DisplayName != null && partner.DisplayName.ToLower().StartsWith(searchLower));
                    if (!matches) continue;
                }

                int unreadCount = await _context.Messages
                    .CountAsync(m => m.ConversationId == conv.Id && m.SenderId != userId && !m.IsRead);

                var lastMsg = await _context.Messages
                    .Where(m => m.ConversationId == conv.Id)
                    .OrderByDescending(m => m.SentAt)
                    .FirstOrDefaultAsync();

                resultList.Add(new
                {
                    conversationId = conv.Id,
                    partnerId = partner.Id,
                    username = partner.Username ?? "",
                    displayName = string.IsNullOrWhiteSpace(partner.DisplayName) ? partner.Username : partner.DisplayName,
                    photoUrl = partner.PhotoUrl,
                    lastMessage = lastMsg != null ? (string.IsNullOrWhiteSpace(lastMsg.Text) ? (lastMsg.ImageUrl != null ? "Photo" : "") : lastMsg.Text) : (string.IsNullOrWhiteSpace(conv.LastMessage) ? "" : conv.LastMessage),
                    lastMessageSenderId = lastMsg?.SenderId ?? "",
                    lastMessageAt = conv.LastMessageAt,
                    lastMessageRead = lastMsg != null ? (lastMsg.SenderId == userId ? lastMsg.IsRead : true) : true,
                    unreadCount = unreadCount,
                    backgroundTheme = conv.BackgroundTheme ?? "default",
                    messageColor = conv.MessageColor ?? "#FF2D55"
                });
            }

            return Ok(resultList);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost("update-theme")]
    public async Task<IActionResult> UpdateTheme([FromBody] UpdateThemeDto dto)
    {
        var (userId, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        var conversation = await _context.Conversations.FirstOrDefaultAsync(c => c.Id == dto.ConversationId);
        if (conversation == null) return NotFound(new { message = "Conversation not found." });

        if (conversation.User1Id != userId && conversation.User2Id != userId)
            return Forbid();

        if (dto.Theme != null)
        {
            conversation.BackgroundTheme = dto.Theme;
        }
        if (dto.MessageColor != null)
        {
            conversation.MessageColor = dto.MessageColor;
        }
        _context.Conversations.Update(conversation);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, theme = conversation.BackgroundTheme, messageColor = conversation.MessageColor });
    }

    [HttpPost("mark-as-read")]
    public async Task<IActionResult> MarkAsRead([FromBody] MarkReadDto dto)
    {
        var (currentUserId, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        var conversation = await _context.Conversations.FirstOrDefaultAsync(c => c.Id == dto.ConversationId);
        if (conversation == null) return NotFound(new { message = "Conversation not found." });

        if (conversation.User1Id != currentUserId && conversation.User2Id != currentUserId)
            return Forbid();

        var unreadMessages = await _context.Messages
            .Where(m => m.ConversationId == dto.ConversationId && m.SenderId != currentUserId && !m.IsRead)
            .ToListAsync();

        if (unreadMessages.Any())
        {
            foreach (var msg in unreadMessages)
            {
                msg.IsRead = true;
            }
            await _context.SaveChangesAsync();

            var receiverId = conversation.User1Id == currentUserId ? conversation.User2Id : conversation.User1Id;
            foreach (var msg in unreadMessages)
            {
                await _hubContext.Clients.Groups(new[] { currentUserId, receiverId! }).SendAsync("MessagesMarkedRead", dto.ConversationId, currentUserId);
            }
        }

        return Ok(new { success = true });
    }

    [HttpPost("mark-message-read")]
    public async Task<IActionResult> MarkMessageRead([FromBody] MarkMessageReadDto dto)
    {
        var (currentUserId, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        var message = await _context.Messages.FindAsync(dto.MessageId);
        if (message == null) return NotFound(new { message = "Message not found." });

        var conversation = await _context.Conversations.FirstOrDefaultAsync(c => c.Id == dto.ConversationId);
        if (conversation == null) return NotFound(new { message = "Conversation not found." });

        if (conversation.User1Id != currentUserId && conversation.User2Id != currentUserId)
            return Forbid();

        if (message.SenderId == currentUserId)
            return Ok(new { success = true });

        message.IsRead = true;
        await _context.SaveChangesAsync();

        var receiverId = conversation.User1Id == currentUserId ? conversation.User2Id : conversation.User1Id;
        await _hubContext.Clients.Groups(new[] { currentUserId, receiverId! }).SendAsync("MessageMarkedRead", dto.MessageId, currentUserId);

        return Ok(new { success = true });
    }

    [HttpGet("history/{conversationId}")]
    public async Task<IActionResult> GetChatHistory(int conversationId)
    {
        var (currentUserId, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        var conversation = await _context.Conversations.FirstOrDefaultAsync(c => c.Id == conversationId);
        if (conversation == null) return NotFound(new { message = "Conversation not found." });

        if (conversation.User1Id != currentUserId && conversation.User2Id != currentUserId)
            return Forbid();

        var messages = await _context.Messages
            .Where(m => m.ConversationId == conversationId)
            .OrderBy(m => m.SentAt)
            .Select(m => new
            {
                m.Id,
                m.ConversationId,
                m.SenderId,
                m.Text,
                m.ImageUrl,
                m.IsRead,
                m.SentAt
            })
            .ToListAsync();

        return Ok(new
        {
            backgroundTheme = conversation.BackgroundTheme ?? "default",
            messageColor = conversation.MessageColor ?? "#FF2D55",
            messages = messages
        });
    }

    [HttpPost("send")]
    public async Task<IActionResult> SendMessage([FromBody] SendMessageDto dto)
    {
        var (senderId, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        if (string.IsNullOrWhiteSpace(dto.Text))
            return BadRequest(new { message = "Message text cannot be empty." });

        var conversation = await _context.Conversations.FirstOrDefaultAsync(c => c.Id == dto.ConversationId);
        if (conversation == null) return NotFound(new { message = "Conversation not found." });

        if (conversation.User1Id != senderId && conversation.User2Id != senderId)
            return Forbid();

        var message = new Message
        {
            ConversationId = dto.ConversationId,
            SenderId = senderId,
            Text = dto.Text.Trim(),
            IsRead = false,
            SentAt = DateTime.UtcNow
        };

        _context.Messages.Add(message);

        conversation.LastMessage = dto.Text.Trim();
        conversation.LastMessageAt = message.SentAt;
        _context.Conversations.Update(conversation);

        await _context.SaveChangesAsync();

        var receiverId = conversation.User1Id == senderId ? conversation.User2Id : conversation.User1Id;

        var messagePayload = new
        {
            id = message.Id,
            conversationId = message.ConversationId,
            senderId = message.SenderId,
            text = message.Text,
            imageUrl = message.ImageUrl,
            isRead = message.IsRead,
            sentAt = message.SentAt
        };

        await _hubContext.Clients.Groups(new[] { senderId, receiverId! }).SendAsync("ReceiveMessage", messagePayload);

        return Ok(messagePayload);
    }

    [HttpPost("send-image")]
    public async Task<IActionResult> SendImageMessage([FromForm] int conversationId, [FromForm] IFormFile image, [FromForm] string? text = null)
    {
        var (senderId, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        var conversation = await _context.Conversations.FirstOrDefaultAsync(c => c.Id == conversationId);
        if (conversation == null) return NotFound(new { message = "Conversation not found." });

        if (conversation.User1Id != senderId && conversation.User2Id != senderId)
            return Forbid();

        if (image == null || image.Length == 0)
            return BadRequest(new { message = "Image is required." });

        var uploadsFolder = Path.Combine(_environment.ContentRootPath, "uploads", "chat");
        if (!Directory.Exists(uploadsFolder))
        {
            Directory.CreateDirectory(uploadsFolder);
        }

        var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(image.FileName)}";
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await image.CopyToAsync(stream);
        }

        var imageUrl = $"/uploads/chat/{uniqueFileName}";

        var message = new Message
        {
            ConversationId = conversationId,
            SenderId = senderId,
            Text = text?.Trim() ?? "Photo",
            ImageUrl = imageUrl,
            IsRead = false,
            SentAt = DateTime.UtcNow
        };

        _context.Messages.Add(message);

        conversation.LastMessage = string.IsNullOrWhiteSpace(text?.Trim()) ? "Photo" : text!.Trim();
        conversation.LastMessageAt = message.SentAt;
        _context.Conversations.Update(conversation);

        await _context.SaveChangesAsync();

        var receiverId = conversation.User1Id == senderId ? conversation.User2Id : conversation.User1Id;

        var messagePayload = new
        {
            id = message.Id,
            conversationId = message.ConversationId,
            senderId = message.SenderId,
            text = message.Text,
            imageUrl = message.ImageUrl,
            isRead = message.IsRead,
            sentAt = message.SentAt
        };

        await _hubContext.Clients.Groups(new[] { senderId, receiverId! }).SendAsync("ReceiveMessage", messagePayload);

        return Ok(messagePayload);
    }
    
    [HttpPost("get-or-create")]
    public async Task<IActionResult> GetOrCreateConversation([FromBody] GetOrCreateConvDto dto)
    {
        var (userId, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        if (string.IsNullOrEmpty(dto.PartnerId))
            return BadRequest(new { message = "PartnerId is required." });

        if (userId == dto.PartnerId)
            return BadRequest(new { message = "Cannot create a conversation with yourself." });

        var partnerExists = await _context.Users.AnyAsync(u => u.Id == dto.PartnerId);
        if (!partnerExists)
            return NotFound(new { message = "Partner user not found." });

        var conv = await _context.Conversations.FirstOrDefaultAsync(c =>
            (c.User1Id == userId && c.User2Id == dto.PartnerId) ||
            (c.User1Id == dto.PartnerId && c.User2Id == userId));

        if (conv == null)
        {
            conv = new Conversation
            {
                User1Id = userId!,
                User2Id = dto.PartnerId,
                LastMessage = "",
                LastMessageAt = DateTime.UtcNow,
                BackgroundTheme = "default"
            };

            _context.Conversations.Add(conv);
            await _context.SaveChangesAsync();
        }

        return Ok(new { conversationId = conv.Id, backgroundTheme = conv.BackgroundTheme, messageColor = conv.MessageColor ?? "#FF2D55" });
    }
}

public record GetOrCreateConvDto(string PartnerId);
public record SendMessageDto(int ConversationId, string Text);
public record UpdateThemeDto(int ConversationId, string? Theme, string? MessageColor);
public record MarkReadDto(int ConversationId);
public record MarkMessageReadDto(int MessageId, int ConversationId);