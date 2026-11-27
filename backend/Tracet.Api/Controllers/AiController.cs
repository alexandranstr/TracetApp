using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Tracet.Application.AiChat;
using Tracet.Application.Common;
using Tracet.Api.Extensions;

namespace Tracet.Api.Controllers;

[EnableRateLimiting(RateLimitPolicies.Ai)]
public class AiController(IAiChatService aiChat) : ApiController
{
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory(
        CancellationToken cancellationToken, [FromQuery] string? provider = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 50) =>
        Ok(await aiChat.GetHistoryAsync(CurrentUserId, provider, PageRequest.Create(page, pageSize, 100), cancellationToken));

    [HttpPost("chat")]
    public async Task<IActionResult> Chat(AiChatRequest request, CancellationToken cancellationToken) =>
        Respond(await aiChat.ChatAsync(CurrentUserId, request, cancellationToken));
}
