using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Tracet.Application.Recommendations;
using Tracet.Application.Tags;
using Tracet.Api.Extensions;

namespace Tracet.Api.Controllers;

[EnableRateLimiting(RateLimitPolicies.Global)]
public class TagsController(ITagService tags, IRecommendationService recommendations) : ApiController
{
    [HttpGet]
    public async Task<IActionResult> GetTags(CancellationToken cancellationToken) =>
        Ok(await tags.GetAllAsync(cancellationToken));

    [HttpGet("recommendations")]
    public async Task<IActionResult> GetRecommendations(CancellationToken cancellationToken) =>
        Ok(await recommendations.GetForUserAsync(CurrentUserId, cancellationToken));
}
