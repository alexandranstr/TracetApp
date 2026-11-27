using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Tracet.Application.Accounts;
using Tracet.Api.Extensions;

namespace Tracet.Api.Controllers;

[EnableRateLimiting(RateLimitPolicies.Auth)]
public class AuthController(IProfileService profiles, IAccountService accounts) : ApiController
{
    [HttpPost("sync")]
    public async Task<IActionResult> Sync(CancellationToken cancellationToken) =>
        Ok(await profiles.SyncAsync(CurrentUserId, User.GetEmail(), User.GetName(), cancellationToken));

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile(CancellationToken cancellationToken) =>
        Respond(await profiles.GetAsync(CurrentUserId, cancellationToken));

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile(UpdateProfileRequest request, CancellationToken cancellationToken) =>
        Respond(await profiles.UpdateAsync(CurrentUserId, request, cancellationToken));

    [HttpPut("toggle-2fa")]
    public async Task<IActionResult> ToggleTwoFactor(ToggleTwoFactorRequest request, CancellationToken cancellationToken) =>
        Respond(await profiles.SetTwoFactorAsync(CurrentUserId, request.Enable, cancellationToken));

    [HttpGet("resolve-email")]
    public async Task<IActionResult> ResolveEmail([FromQuery] string? username, CancellationToken cancellationToken) =>
        Respond(await profiles.ResolveEmailAsync(username ?? string.Empty, cancellationToken));

    [HttpDelete("account")]
    public async Task<IActionResult> DeleteAccount(CancellationToken cancellationToken) =>
        Respond(await accounts.DeleteAsync(CurrentUserId, cancellationToken), "User account and all associated data removed successfully.");
}
