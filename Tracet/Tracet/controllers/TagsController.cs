using FirebaseAdmin.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Tracet.data;
using Tracet.services;

namespace Tracet.controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [EnableRateLimiting("global")]
    public class TagsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TagsController(AppDbContext context)
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
                FirebaseToken decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken, checkRevoked: true);
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

        [HttpGet]
        public async Task<IActionResult> GetTags()
        {
            var (_, errorResult) = await ExtractAndVerifyTokenAsync();
            if (errorResult != null) return errorResult;

            var tags = await _context.Tags
                .OrderBy(t => t.Id)
                .Select(t => new { t.Id, t.Name })
                .ToListAsync();

            return Ok(tags);
        }

        [HttpGet("recommendations")]
        public async Task<IActionResult> GetRecommendations()
        {
            var (currentUserId, errorResult) = await ExtractAndVerifyTokenAsync();
            if (errorResult != null) return errorResult;

            var tagNames = await _context.Tags
                .ToDictionaryAsync(tag => tag.Id, tag => tag.Name);

            var userPins = await _context.Pins
                .Where(p => p.UserId == currentUserId)
                .ToListAsync();

            var userTagCounts = RecommendationScorer.CountTagOccurrences(
                userPins.Select(pin => pin.TagsVectorJson), tagNames.Keys);
            var visitedLocationIds = new HashSet<int>();
            foreach (var pin in userPins)
            {
                visitedLocationIds.Add(pin.LocationId);
            }

            System.Console.WriteLine($"[RECOMMENDATIONS] User: {currentUserId}, Pins: {userPins.Count}, UserTags: {string.Join(",", userTagCounts.Keys)}, Visited: {string.Join(",", visitedLocationIds)}");

            var allLocations = await _context.Locations
                .Where(l => !visitedLocationIds.Contains(l.Id))
                .Include(l => l.LocationTags)
                .ToListAsync();

            System.Console.WriteLine($"[RECOMMENDATIONS] Unvisited locations: {allLocations.Count}");

            var candidateLocationIds = allLocations.Select(location => location.Id).ToList();
            var locationPins = await _context.Pins
                .Where(pin => candidateLocationIds.Contains(pin.LocationId))
                .Select(pin => new { pin.LocationId, pin.TagsVectorJson })
                .ToListAsync();
            var locationTagCounts = locationPins
                .GroupBy(pin => pin.LocationId)
                .ToDictionary(
                    group => group.Key,
                    group => RecommendationScorer.CountTagOccurrences(
                        group.Select(pin => pin.TagsVectorJson), tagNames.Keys));

            var scored = allLocations.Select(l =>
            {
                var locationCounts = locationTagCounts.TryGetValue(l.Id, out var pinTagCounts)
                    ? pinTagCounts
                    : l.LocationTags
                        .Where(locationTag => locationTag.TagCount > 0 && tagNames.ContainsKey(locationTag.TagId))
                        .ToDictionary(locationTag => locationTag.TagId, locationTag => locationTag.TagCount);
                var tags = locationCounts
                    .Where(tag => tag.Value > 0 && tagNames.ContainsKey(tag.Key))
                    .Select(tag => new
                    {
                        TagId = tag.Key,
                        TagCount = tag.Value,
                        Name = tagNames[tag.Key]
                    })
                    .OrderByDescending(tag => tag.TagCount)
                    .ThenBy(tag => tag.TagId)
                    .ToList();

                var score = Math.Round(
                    RecommendationScorer.CalculateCosineMatchScore(userTagCounts, locationCounts), 1);
                var matchedTags = tags
                    .Where(tag => userTagCounts.ContainsKey(tag.TagId))
                    .Select(tag => tag.Name)
                    .ToList();
                var topTag = tags.FirstOrDefault();

                var fullLocation = new List<string>();
                if (!string.IsNullOrEmpty(l.PlaceName)) fullLocation.Add(l.PlaceName);
                if (!string.IsNullOrEmpty(l.CityName)) fullLocation.Add(l.CityName);
                if (!string.IsNullOrEmpty(l.CountryName)) fullLocation.Add(l.CountryName);
                var locationText = fullLocation.Count > 0 ? string.Join(", ", fullLocation) : "A saved location";

                var recommendationDesc = score > 70
                    ? "This place is a strong match for the tags you use most."
                    : score > 40
                        ? "This place shares several of your most-used tags."
                        : score > 0
                            ? "This place has some tag overlap with your saved places."
                            : "Explore this place as a new suggestion.";

                return new
                {
                    id = l.Id,
                    latitude = l.Latitude,
                    longitude = l.Longitude,
                    title = locationText,
                    category = topTag?.Name ?? "Travel Spot",
                    description = recommendationDesc,
                    matchScore = score,
                    matchedTags,
                    tagIds = tags.Select(tag => tag.TagId).ToList()
                };
            }).OrderByDescending(l => l.matchScore)
              .ThenByDescending(l => l.tagIds.Count)
              .ThenByDescending(l => l.matchedTags.Count)
              .Take(5)
              .ToList();

            System.Console.WriteLine($"[RECOMMENDATIONS] Scored results: {scored.Count}, Top score: {(scored.Count > 0 ? scored[0].matchScore : "N/A")}");

            if (scored.Count == 0)
            {
                var fallbackLocations = await _context.Locations
                    .Where(l => !visitedLocationIds.Contains(l.Id) && (!string.IsNullOrEmpty(l.PlaceName) || !string.IsNullOrEmpty(l.CityName)))
                    .OrderByDescending(l => l.Id)
                    .Take(5)
                    .ToListAsync();

                var fallback = fallbackLocations.Select(l =>
                {
                    var fullLocation = new List<string>();
                    if (!string.IsNullOrEmpty(l.PlaceName)) fullLocation.Add(l.PlaceName);
                    if (!string.IsNullOrEmpty(l.CityName)) fullLocation.Add(l.CityName);
                    if (!string.IsNullOrEmpty(l.CountryName)) fullLocation.Add(l.CountryName);
                    var locationText = fullLocation.Count > 0 ? string.Join(", ", fullLocation) : "A saved location";

                    return new
                    {
                        id = l.Id,
                        latitude = l.Latitude,
                        longitude = l.Longitude,
                        title = locationText,
                        category = "Travel Spot",
                        description = "This might interest you, explore new places based on your travel style.",
                        matchScore = 0,
                        matchedTags = new List<string>(),
                        tagIds = new List<int>()
                    };
                }).ToList();

                System.Console.WriteLine($"[RECOMMENDATIONS] Fallback results: {fallback.Count}");
                return Ok(fallback);
            }

            return Ok(scored);
        }
    }
}