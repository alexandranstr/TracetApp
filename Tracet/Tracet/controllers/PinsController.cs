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
}