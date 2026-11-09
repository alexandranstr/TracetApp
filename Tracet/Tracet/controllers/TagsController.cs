using FirebaseAdmin.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Tracet.data;
using Tracet.models;

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

            var userPins = await _context.Pins
                .Where(p => p.UserId == currentUserId)
                .ToListAsync();

            var userTagIds = new HashSet<int>();
            var visitedLocationIds = new HashSet<int>();
            foreach (var pin in userPins)
            {
                visitedLocationIds.Add(pin.LocationId);
                if (!string.IsNullOrEmpty(pin.TagsVectorJson))
                {
                    try
                    {
                        var tagIds = System.Text.Json.JsonSerializer.Deserialize<List<int>>(pin.TagsVectorJson);
                        if (tagIds != null)
                        {
                            foreach (var id in tagIds)
                            {
                                userTagIds.Add(id);
                            }
                        }
                    }
                    catch { }
                }
            }

            System.Console.WriteLine($"[RECOMMENDATIONS] User: {currentUserId}, Pins: {userPins.Count}, UserTags: {string.Join(",", userTagIds)}, Visited: {string.Join(",", visitedLocationIds)}");

            var allLocations = await _context.Locations
                .Where(l => !visitedLocationIds.Contains(l.Id))
                .Include(l => l.LocationTags)
                    .ThenInclude(lt => lt.Tag)
                .ToListAsync();

            System.Console.WriteLine($"[RECOMMENDATIONS] Unvisited locations: {allLocations.Count}");

            var scored = allLocations.Select(l =>
            {
                var tags = l.LocationTags.Select(lt => new
                {
                    lt.TagId,
                    lt.TagCount,
                    lt.Tag.Name
                }).ToList();

                var totalTagWeight = tags.Sum(t => t.TagCount);
                var matchedWeight = tags
                    .Where(t => userTagIds.Contains(t.TagId))
                    .Sum(t => t.TagCount);
                var score = totalTagWeight > 0 ? Math.Round((matchedWeight / (double)totalTagWeight) * 100) : 0;
                var matchedTags = tags.Where(t => userTagIds.Contains(t.TagId)).Select(t => t.Name).ToList();
                var topTag = tags.OrderByDescending(t => t.TagCount).FirstOrDefault();

                var fullLocation = new List<string>();
                if (!string.IsNullOrEmpty(l.PlaceName)) fullLocation.Add(l.PlaceName);
                if (!string.IsNullOrEmpty(l.CityName)) fullLocation.Add(l.CityName);
                if (!string.IsNullOrEmpty(l.CountryName)) fullLocation.Add(l.CountryName);
                var locationText = fullLocation.Count > 0 ? string.Join(", ", fullLocation) : "A saved location";

                var recommendationDesc = score > 70 ? "You'd love this place, it perfectly matches your other trips!" : (score > 40 ? "You'd probably like this, it matches with the rest of your trips." : "This might interest you, it shares some tags with your saved places.");

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
                    tagIds = tags.Select(t => t.TagId).ToList()
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