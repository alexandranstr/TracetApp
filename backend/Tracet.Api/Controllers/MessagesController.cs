using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Tracet.Application.Common;
using Tracet.Application.Messaging;
using Tracet.Api.Extensions;

namespace Tracet.Api.Controllers;

[EnableRateLimiting(RateLimitPolicies.Global)]
public class MessagesController(IMessageService messages) : ApiController
{
    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations(
        CancellationToken cancellationToken, [FromQuery] string? q = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 50) =>
        Ok(await messages.GetConversationsAsync(CurrentUserId, q, PageRequest.Create(page, pageSize, 100), cancellationToken));

    [HttpPost("get-or-create")]
    public async Task<IActionResult> StartConversation(StartConversationRequest request, CancellationToken cancellationToken) =>
        Respond(await messages.StartConversationAsync(CurrentUserId, request.PartnerId, cancellationToken));

    [HttpGet("history/{conversationId:int}")]
    public async Task<IActionResult> GetHistory(
        int conversationId, CancellationToken cancellationToken, [FromQuery] int skip = 0, [FromQuery] int take = 50) =>
        Respond(await messages.GetHistoryAsync(CurrentUserId, conversationId, skip, take, cancellationToken));

    [HttpPost("send")]
    public async Task<IActionResult> Send(SendMessageRequest request, CancellationToken cancellationToken) =>
        Respond(await messages.SendTextAsync(CurrentUserId, request, cancellationToken));

    [HttpPost("send-image")]
    public async Task<IActionResult> SendImage(SendImageRequest request, CancellationToken cancellationToken) =>
        Respond(await messages.SendImageAsync(CurrentUserId, request, cancellationToken));

    [HttpPost("update-theme")]
    public async Task<IActionResult> UpdateTheme(UpdateThemeRequest request, CancellationToken cancellationToken) =>
        Respond(await messages.UpdateThemeAsync(CurrentUserId, request, cancellationToken));

    [HttpPost("mark-as-read")]
    public async Task<IActionResult> MarkConversationRead(MarkConversationReadRequest request, CancellationToken cancellationToken) =>
        Respond(await messages.MarkConversationReadAsync(CurrentUserId, request.ConversationId, cancellationToken), "Conversation marked as read.");

    [HttpPost("mark-message-read")]
    public async Task<IActionResult> MarkMessageRead(MarkMessageReadRequest request, CancellationToken cancellationToken) =>
        Respond(await messages.MarkMessageReadAsync(CurrentUserId, request, cancellationToken), "Message marked as read.");
}
