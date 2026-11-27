using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Tracet.Application.Blocking;
using Tracet.Application.Common;
using Tracet.Api.Extensions;
using Tracet.Application.Friendships;
using Tracet.Api.Contracts;

namespace Tracet.Api.Controllers;

[EnableRateLimiting(RateLimitPolicies.Global)]
public class FriendshipsController(IFriendshipService friendships, IBlockingService blocking) : ApiController
{
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string? q, CancellationToken cancellationToken) =>
        Ok(await friendships.SearchUsersAsync(CurrentUserId, q, cancellationToken));

    [HttpGet("social-overview")]
    public async Task<IActionResult> GetSocialOverview(
        CancellationToken cancellationToken, [FromQuery] int page = 1, [FromQuery] int pageSize = 50) =>
        Ok(await friendships.GetSocialOverviewAsync(CurrentUserId, PageRequest.Create(page, pageSize, 100), cancellationToken));

    [HttpGet("requests")]
    public async Task<IActionResult> GetPendingRequests(
        CancellationToken cancellationToken, [FromQuery] int page = 1, [FromQuery] int pageSize = 20) =>
        Ok(await friendships.GetPendingRequestsAsync(CurrentUserId, PageRequest.Create(page, pageSize, 50), cancellationToken));

    [HttpPost("request")]
    public async Task<IActionResult> SendRequest(SendFriendRequest request, CancellationToken cancellationToken) =>
        Respond(await friendships.SendRequestAsync(CurrentUserId, request.ReceiverId, cancellationToken),
            "Friend request sent successfully.");

    [HttpPost("respond")]
    public async Task<IActionResult> RespondToRequest(RespondToFriendRequest request, CancellationToken cancellationToken) =>
        Respond(await friendships.RespondAsync(CurrentUserId, request.SenderId, request.Action, cancellationToken),
            status => Ok(new MessageResponse(true, $"Request successfully {status.ToString().ToLowerInvariant()}.")));

    [HttpPost("block")]
    public async Task<IActionResult> Block(BlockUserRequest request, CancellationToken cancellationToken) =>
        Respond(await blocking.BlockAsync(CurrentUserId, request.TargetUserId, cancellationToken), "User has been blocked.");

    [HttpPost("unblock")]
    public async Task<IActionResult> Unblock(BlockUserRequest request, CancellationToken cancellationToken) =>
        Respond(await blocking.UnblockAsync(CurrentUserId, request.TargetUserId, cancellationToken), "User has been unblocked.");

    [HttpGet("block-status/{targetUserId}")]
    public async Task<IActionResult> GetBlockStatus(string targetUserId, CancellationToken cancellationToken) =>
        Ok(await blocking.GetStatusAsync(CurrentUserId, targetUserId, cancellationToken));

    [HttpGet("blocked")]
    public async Task<IActionResult> GetBlockedUsers(
        CancellationToken cancellationToken, [FromQuery] int page = 1, [FromQuery] int pageSize = 20) =>
        Ok(await blocking.GetBlockedUsersAsync(CurrentUserId, PageRequest.Create(page, pageSize, 50), cancellationToken));
}
