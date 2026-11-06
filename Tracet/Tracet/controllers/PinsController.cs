using FirebaseAdmin.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Tracet.data;
using Tracet.DTOs;
using Tracet.models;

namespace Tracet.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("global")]
public class PinsController : ControllerBase
{
    private readonly AppDbContext _context;

    private static readonly string[] PredefinedCategories = new[]
    {
        "General",
        "Cafe",
        "Restaurant",
        "Museum",
        "Park",
        "Hotel",
        "Attraction",
        "Shop",
        "Transport",
        "Nature",
        "Nightlife",
        "Sports",
        "Shopping",
        "Accommodation",
        "Landmark"
    };

    public PinsController(AppDbContext context)
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
            Console.WriteLine($"[FIREBASE ERROR] Cod: {ex.ErrorCode} | Mesaj: {ex.Message}");
            return (null, Unauthorized(new { message = "Invalid or expired token.", error = ex.Message, code = ex.ErrorCode }));
        }
        catch (Exception ex)
        {
            return (null, StatusCode(500, new { message = "Authentication error.", error = ex.Message }));
        }
    }

    [HttpGet("categories")]
    public IActionResult GetCategories()
    {
        return Ok(PredefinedCategories);
    }

    [HttpGet]
    public async Task<IActionResult> GetPins()
    {
        var (currentUserId, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        var acceptedFriendUserIds = await _context.Friendships
            .Where(f => (f.UserId == currentUserId || f.FriendId == currentUserId) && f.Status == "Accepted")
            .Select(f => f.UserId == currentUserId ? f.FriendId : f.UserId)
            .ToListAsync();

        var visiblePins = await _context.Pins
            .Include(p => p.Location)
            .Include(p => p.User)
            .Where(p =>
                p.UserId == currentUserId
                ||
                (acceptedFriendUserIds.Contains(p.UserId) && !p.IsPrivate)
            )
            .OrderByDescending(p => p.VisitedAt)
            .Select(p => new
            {
                p.Id,
                p.Title,
                p.JournalEntry,
                p.Category,
                p.Rating,
                p.IsPrivate,
                p.VisitedAt,
                p.CreatedAt,
                p.UserId,
                UserName = p.User != null ? p.User.Username : "Anonymous",
                p.LocationId,
                p.Location,
                p.PhotoUrlsJson,
                p.TagsVectorJson
            })
            .ToListAsync();

        return Ok(visiblePins);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePin(int id)
    {
        var (userId, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        var pin = await _context.Pins.FindAsync(id);
        if (pin == null) return NotFound();

        if (pin.UserId != userId)
        {
            return Unauthorized("You can only delete your own pins.");
        }

        _context.Pins.Remove(pin);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{id}/visibility")]
    public async Task<IActionResult> ToggleVisibility(int id)
    {
        var (userId, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        var pin = await _context.Pins
            .Include(p => p.Location)
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (pin == null) return NotFound();

        if (pin.UserId != userId)
        {
            return Unauthorized("You can only update your own pins.");
        }

        pin.IsPrivate = !pin.IsPrivate;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            pin.Id,
            pin.Title,
            pin.JournalEntry,
            pin.Category,
            pin.Rating,
            pin.IsPrivate,
            pin.VisitedAt,
            pin.CreatedAt,
            pin.UserId,
            UserName = pin.User != null ? pin.User.Username : "Anonymous",
            pin.LocationId,
            pin.Location,
            pin.PhotoUrlsJson,
            pin.TagsVectorJson
        });
    }

    [HttpPost]
    public async Task<IActionResult> CreatePin([FromBody] CreatePinDto dto)
    {
        var (userId, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        if (dto == null || dto.Location == null)
        {
            return BadRequest("Invalid pin or location data.");
        }

        if (!string.IsNullOrEmpty(dto.Category) && !PredefinedCategories.Contains(dto.Category))
        {
            return BadRequest(new { message = $"Invalid category. Must be one of: {string.Join(", ", PredefinedCategories)}" });
        }

        Location? location = null;

        if (!string.IsNullOrEmpty(dto.Location.GooglePlaceId))
        {
            location = await _context.Locations
                .Include(l => l.LocationTags)
                .FirstOrDefaultAsync(l => l.GooglePlaceId == dto.Location.GooglePlaceId);
        }

        if (location == null)
        {
            location = await _context.Locations
                .Include(l => l.LocationTags)
                .FirstOrDefaultAsync(l =>
                    Math.Abs(l.Latitude - dto.Location.Latitude) < 0.0001 &&
                    Math.Abs(l.Longitude - dto.Location.Longitude) < 0.0001);
        }

        if (location == null)
        {
            location = new Location
            {
                Latitude = dto.Location.Latitude,
                Longitude = dto.Location.Longitude,
                CityName = dto.Location.CityName ?? string.Empty,
                CountryName = dto.Location.CountryName ?? string.Empty,
                Address = dto.Location.Address,
                PlaceName = dto.Location.PlaceName,
                EntityType = dto.Location.EntityType,
                GooglePlaceId = dto.Location.GooglePlaceId
            };

            _context.Locations.Add(location);
            await _context.SaveChangesAsync();
        }

        if (!string.IsNullOrEmpty(dto.TagsVectorJson))
        {
            try
            {
                var tagIds = JsonSerializer.Deserialize<List<int>>(dto.TagsVectorJson);
                if (tagIds != null && tagIds.Count > 0)
                {
                    foreach (var tagId in tagIds)
                    {
                        bool tagExists = await _context.Tags.AnyAsync(t => t.Id == tagId);
                        if (!tagExists) continue;

                        var existingRelation = await _context.LocationTags
                            .FirstOrDefaultAsync(lt => lt.LocationId == location.Id && lt.TagId == tagId);

                        if (existingRelation != null)
                        {
                            existingRelation.TagCount += 1;
                        }
                        else
                        {
                            _context.LocationTags.Add(new LocationTag
                            {
                                LocationId = location.Id,
                                TagId = tagId,
                                TagCount = 1
                            });
                        }
                    }
                    await _context.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing location tags: {ex.Message}");
            }
        }

        var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
        if (!userExists)
        {
            return NotFound($"User with ID '{userId}' does not exist in the database.");
        }

        var pin = new Pin
        {
            Title = dto.Title,
            JournalEntry = dto.JournalEntry ?? string.Empty,
            Category = string.IsNullOrEmpty(dto.Category) ? "General" : dto.Category,
            Rating = dto.Rating,
            IsPrivate = dto.IsPrivate,
            VisitedAt = dto.VisitedAt,
            CreatedAt = DateTime.UtcNow,
            UserId = userId!,
            LocationId = location.Id,
            PhotoUrlsJson = dto.PhotoUrlsJson ?? "[]",
            TagsVectorJson = dto.TagsVectorJson ?? "[]"
        };

        _context.Pins.Add(pin);
        await _context.SaveChangesAsync();

        var responseDto = new PinResponseDto
        {
            Id = pin.Id,
            Title = pin.Title,
            JournalEntry = pin.JournalEntry,
            Category = pin.Category,
            Rating = pin.Rating,
            IsPrivate = pin.IsPrivate,
            VisitedAt = pin.VisitedAt,
            CreatedAt = pin.CreatedAt,
            UserId = pin.UserId,
            PhotoUrlsJson = pin.PhotoUrlsJson,
            TagsVectorJson = pin.TagsVectorJson,
            Location = new LocationResponseDto
            {
                Id = location.Id,
                Latitude = location.Latitude,
                Longitude = location.Longitude,
                CityName = location.CityName,
                CountryName = location.CountryName,
                Address = location.Address,
                PlaceName = location.PlaceName,
                EntityType = (int)location.EntityType,
                GooglePlaceId = location.GooglePlaceId
            }
        };

        return CreatedAtAction(nameof(GetPins), null, responseDto);
    }

    [HttpGet("statistics")]
    public async Task<IActionResult> GetStatistics()
    {
        var (currentUserId, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        var userPins = await _context.Pins
            .Include(p => p.Location)
            .Where(p => p.UserId == currentUserId)
            .ToListAsync();

        if (!userPins.Any())
        {
            return Ok(new
            {
                totalPins = 0,
                averageRating = 0.0,
                countriesVisited = 0,
                citiesVisited = 0,
                topCountries = new List<object>(),
                topCities = new List<object>(),
                topCategories = new List<object>(),
                topTags = new List<object>(),
                pinsByMonth = new List<object>()
            });
        }

        var totalPins = userPins.Count;

        var ratedPins = userPins.Where(p => p.Rating.HasValue).ToList();
        var averageRating = ratedPins.Any() ? ratedPins.Average(p => p.Rating!.Value) : 0.0;

        var countries = userPins
            .Where(p => !string.IsNullOrEmpty(p.Location?.CountryName))
            .GroupBy(p => p.Location!.CountryName!)
            .Select(g => new { Country = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(5)
            .ToList();

        var countriesVisited = countries.Count;

        var cities = userPins
            .Where(p => !string.IsNullOrEmpty(p.Location?.CityName))
            .GroupBy(p => p.Location!.CityName!)
            .Select(g => new { City = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(5)
            .ToList();

        var citiesVisited = cities.Count;

        var categories = userPins
            .GroupBy(p => p.Category)
            .Select(g => new { Category = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(5)
            .ToList();

        var allTagIds = new List<int>();
        foreach (var pin in userPins)
        {
            if (!string.IsNullOrEmpty(pin.TagsVectorJson))
            {
                try
                {
                    var tagIds = JsonSerializer.Deserialize<List<int>>(pin.TagsVectorJson);
                    if (tagIds != null)
                    {
                        allTagIds.AddRange(tagIds);
                    }
                }
                catch { }
            }
        }

        var topTagsList = new List<object>();
        if (allTagIds.Any())
        {
            var tagCounts = allTagIds.GroupBy(t => t).Select(g => new { TagId = g.Key, Count = g.Count() }).OrderByDescending(x => x.Count).Take(5).ToList();

            var tags = await _context.Tags.Where(t => tagCounts.Select(tc => tc.TagId).Contains(t.Id)).ToListAsync();

            foreach (var tc in tagCounts)
            {
                var tag = tags.FirstOrDefault(t => t.Id == tc.TagId);
                topTagsList.Add(new
                {
                    TagName = tag?.Name ?? $"Tag {tc.TagId}",
                    Count = tc.Count
                });
            }
        }

        var now = DateTime.UtcNow;
        var pinsByMonth = new List<object>();
        for (int i = 11; i >= 0; i--)
        {
            var targetDate = now.AddMonths(-i);
            var year = targetDate.Year;
            var month = targetDate.Month;

            var count = userPins.Count(p => p.CreatedAt.Year == year && p.CreatedAt.Month == month);

            pinsByMonth.Add(new
            {
                Month = month,
                Year = year,
                Count = count
            });
        }

        return Ok(new
        {
            totalPins,
            averageRating = Math.Round(averageRating, 1),
            countriesVisited,
            citiesVisited,
            topCountries = countries,
            topCities = cities,
            topCategories = categories,
            topTags = topTagsList,
            pinsByMonth
        });
    }

    [HttpGet("shared-history")]
    public async Task<IActionResult> GetSharedHistory()
    {
        var (currentUserId, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        var acceptedFriendUserIds = await _context.Friendships
            .Where(f => (f.UserId == currentUserId || f.FriendId == currentUserId) && f.Status == "Accepted")
            .Select(f => f.UserId == currentUserId ? f.FriendId : f.UserId)
            .ToListAsync();

        var sharedPins = await _context.Pins
            .Include(p => p.Location)
            .Include(p => p.User)
            .Where(p =>
                acceptedFriendUserIds.Contains(p.UserId) &&
                p.UserId != currentUserId &&
                !p.IsPrivate
            )
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new
            {
                p.Id,
                p.Title,
                p.JournalEntry,
                p.Category,
                p.Rating,
                p.IsPrivate,
                p.VisitedAt,
                p.CreatedAt,
                p.UserId,
                UserName = p.User != null ? p.User.Username : "Anonymous",
                UserPhotoUrl = p.User != null ? p.User.PhotoUrl : (string?)null,
                p.LocationId,
                Location = new
                {
                    p.Location.Id,
                    p.Location.Latitude,
                    p.Location.Longitude,
                    p.Location.CityName,
                    p.Location.CountryName,
                    p.Location.Address,
                    p.Location.PlaceName,
                    EntityType = (int)p.Location.EntityType,
                    p.Location.GooglePlaceId
                },
                p.PhotoUrlsJson,
                p.TagsVectorJson
            })
            .ToListAsync();

        return Ok(sharedPins);
    }

    [HttpGet("my-pins")]
    public async Task<IActionResult> GetMyPins([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var (currentUserId, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        page = Math.Max(1, page);
        pageSize = Math.Max(1, Math.Min(50, pageSize));

        var query = _context.Pins
            .Include(p => p.Location)
            .Where(p => p.UserId == currentUserId)
            .OrderByDescending(p => p.CreatedAt);

        var totalPins = await query.CountAsync();
        var totalPages = (int)Math.Ceiling((double)totalPins / pageSize);

        var userPins = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new
            {
                p.Id,
                p.Title,
                p.JournalEntry,
                p.Category,
                p.Rating,
                p.IsPrivate,
                p.VisitedAt,
                p.CreatedAt,
                p.UserId,
                p.LocationId,
                Location = new
                {
                    p.Location.Id,
                    p.Location.Latitude,
                    p.Location.Longitude,
                    p.Location.CityName,
                    p.Location.CountryName,
                    p.Location.Address,
                    p.Location.PlaceName,
                    EntityType = (int)p.Location.EntityType,
                    p.Location.GooglePlaceId
                },
                p.PhotoUrlsJson,
                p.TagsVectorJson
            })
            .ToListAsync();

        return Ok(new
        {
            pins = userPins,
            pagination = new
            {
                currentPage = page,
                pageSize,
                totalPins,
                totalPages,
                hasPreviousPage = page > 1,
                hasNextPage = page < totalPages
            }
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePin(int id, [FromBody] UpdatePinDto dto)
    {
        var (userId, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        var pin = await _context.Pins
            .Include(p => p.Location)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (pin == null) return NotFound();

        if (pin.UserId != userId)
        {
            return Unauthorized("You can only update your own pins.");
        }

        if (dto.Title != null)
            pin.Title = dto.Title;
        if (dto.JournalEntry != null)
            pin.JournalEntry = dto.JournalEntry;
        if (dto.Category != null)
            pin.Category = dto.Category;
        if (dto.Rating.HasValue)
            pin.Rating = dto.Rating;
        if (dto.IsPrivate.HasValue)
            pin.IsPrivate = dto.IsPrivate.Value;
        if (dto.PhotoUrlsJson != null)
            pin.PhotoUrlsJson = dto.PhotoUrlsJson;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            pin.Id,
            pin.Title,
            pin.JournalEntry,
            pin.Category,
            pin.Rating,
            pin.IsPrivate,
            pin.VisitedAt,
            pin.CreatedAt,
            pin.UserId,
            pin.LocationId,
            Location = new
            {
                pin.Location.Id,
                pin.Location.Latitude,
                pin.Location.Longitude,
                pin.Location.CityName,
                pin.Location.CountryName,
                pin.Location.Address,
                pin.Location.PlaceName,
                EntityType = (int)pin.Location.EntityType,
                pin.Location.GooglePlaceId
            },
            pin.PhotoUrlsJson,
            pin.TagsVectorJson
        });
    }
}