using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Tracet.Application.Common;
using Tracet.Api.Extensions;
using Tracet.Application.Pins;
using Tracet.Application.Pins.Statistics;
using Tracet.Domain.Constants;

namespace Tracet.Api.Controllers;

[EnableRateLimiting(RateLimitPolicies.Global)]
public class PinsController(IPinService pins, IPinStatisticsService statistics) : ApiController
{
    [AllowAnonymous]
    [HttpGet("categories")]
    public IActionResult GetCategories() => Ok(PinCategories.All);

    [HttpGet("nearby")]
    public async Task<IActionResult> GetNearby(
        [FromQuery] double swLat, [FromQuery] double swLng, [FromQuery] double neLat, [FromQuery] double neLng,
        CancellationToken cancellationToken) =>
        Ok(await pins.GetNearbyAsync(CurrentUserId, new BoundingBox(swLat, swLng, neLat, neLng), cancellationToken));

    [HttpGet]
    public async Task<IActionResult> GetVisible(
        CancellationToken cancellationToken, [FromQuery] int page = 1, [FromQuery] int pageSize = 20) =>
        Ok(await pins.GetVisibleAsync(CurrentUserId, PageRequest.Create(page, pageSize, 50), cancellationToken));

    [HttpGet("shared-history")]
    public async Task<IActionResult> GetSharedHistory(
        CancellationToken cancellationToken, [FromQuery] int page = 1, [FromQuery] int pageSize = 20) =>
        Ok(await pins.GetSharedHistoryAsync(CurrentUserId, PageRequest.Create(page, pageSize, 50), cancellationToken));

    [HttpGet("my-pins")]
    public async Task<IActionResult> GetMine(
        CancellationToken cancellationToken, [FromQuery] int page = 1, [FromQuery] int pageSize = 10) =>
        Ok(await pins.GetMineAsync(CurrentUserId, PageRequest.Create(page, pageSize, 50), cancellationToken));

    [HttpGet("statistics")]
    public async Task<IActionResult> GetStatistics(CancellationToken cancellationToken) =>
        Ok(await statistics.GetAsync(CurrentUserId, cancellationToken));

    [HttpPost]
    public async Task<IActionResult> Create(CreatePinRequest request, CancellationToken cancellationToken) =>
        Respond(await pins.CreateAsync(CurrentUserId, request, cancellationToken),
            pin => StatusCode(StatusCodes.Status201Created, pin));

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdatePinRequest request, CancellationToken cancellationToken) =>
        Respond(await pins.UpdateAsync(CurrentUserId, id, request, cancellationToken));

    [HttpPatch("{id:int}/visibility")]
    public async Task<IActionResult> ToggleVisibility(int id, CancellationToken cancellationToken) =>
        Respond(await pins.ToggleVisibilityAsync(CurrentUserId, id, cancellationToken));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken) =>
        Respond(await pins.DeleteAsync(CurrentUserId, id, cancellationToken), NoContent);
}
