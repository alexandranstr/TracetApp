using FirebaseAdmin.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.Json;
using Tracet.data;
using Tracet.DTOs;
using Tracet.models;

namespace Tracet.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [EnableRateLimiting("global")]
    public class AiController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public AiController(AppDbContext context, HttpClient httpClient, IConfiguration configuration)
        {
            _context = context;
            _httpClient = httpClient;
            _configuration = configuration;
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
            catch (Exception ex)
            {
                return (null, Unauthorized(new { message = "Invalid or expired token.", error = ex.Message }));
            }
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetHistory()
        {
            var (userId, errorResult) = await ExtractAndVerifyTokenAsync();
            if (errorResult != null) return errorResult;

            var history = await _context.AIChatHistories
                .Where(h => h.UserId == userId)
                .OrderBy(h => h.Timestamp)
                .ToListAsync();

            var result = history.Select(h => new
            {
                id = h.Id.ToString(),
                sender = h.Role,
                text = h.Content,
                timestamp = h.Timestamp
            });

            return Ok(result);
        }

        [HttpPost("chat")]
        public async Task<IActionResult> ChatWithAi([FromBody] AiChatRequestDto dto)
        {
            try
            {
                var (userId, errorResult) = await ExtractAndVerifyTokenAsync();
                if (errorResult != null) return errorResult;

                if (dto == null || string.IsNullOrWhiteSpace(dto.Message))
                {
                    return BadRequest(new { message = "Message cannot be empty." });
                }

                _context.AIChatHistories.Add(new AIChatHistory
                {
                    UserId = userId!,
                    Role = "user",
                    Content = dto.Message,
                    Timestamp = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();

                var apiKey = _configuration["GeminiApiKey"];
                if (string.IsNullOrEmpty(apiKey))
                {
                    return StatusCode(500, new { message = "AI service is not configured. Please check the Gemini API key." });
                }

                // Gather user context for a personalized system prompt
                var user = await _context.Users.FindAsync(userId);
                var userPins = await _context.Pins
                    .Where(p => p.UserId == userId)
                    .OrderByDescending(p => p.VisitedAt)
                    .Take(15)
                    .ToListAsync();

                var pinLocationIds = userPins.Select(p => p.LocationId).Distinct().ToList();
                var locations = await _context.Locations
                    .Where(l => pinLocationIds.Contains(l.Id))
                    .ToListAsync();

                var locationIds = locations.Select(l => l.Id).ToList();
                var locationTags = await _context.LocationTags
                    .Where(lt => locationIds.Contains(lt.LocationId))
                    .ToListAsync();

                // Fetch tag names eagerly
                var tagIds = locationTags.Select(lt => lt.TagId).Distinct().ToList();
                var tags = await _context.Tags
                    .Where(t => tagIds.Contains(t.Id))
                    .ToListAsync();
                var tagMap = tags.ToDictionary(t => t.Id, t => t.Name);

                // Build location -> tag names map
                var locationTagNamesMap = locationTags
                    .GroupBy(lt => lt.LocationId)
                    .ToDictionary(g => g.Key, g => g.Where(lt => tagMap.ContainsKey(lt.TagId))
                        .Select(lt => tagMap[lt.TagId]).Distinct().ToList());

                // Collect all unique tags the user has interacted with
                var userTags = locationTags
                    .Where(lt => tagMap.ContainsKey(lt.TagId))
                    .Select(lt => tagMap[lt.TagId])
                    .Distinct()
                    .ToList();

                // Build system prompt with user context
                var systemPromptParts = new List<string>();
                systemPromptParts.Add("You are Tracet AI, a friendly and helpful personal travel assistant for the Tracet app. The user saves pins (places they visit) on the app.");

                if (!string.IsNullOrEmpty(user?.DisplayName))
                {
                    systemPromptParts.Add($"The user's name is {user.DisplayName}.");
                }
                if (!string.IsNullOrEmpty(user?.HomeCountry))
                {
                    systemPromptParts.Add($"The user is from {user.HomeCountry}.");
                }

                if (userPins.Count > 0)
                {
                    var pinDetails = new List<string>();
                    foreach (var pin in userPins)
                    {
                        var location = locations.FirstOrDefault(l => l.Id == pin.LocationId);
                        var placeName = location?.PlaceName ?? pin.Title;
                        var city = !string.IsNullOrEmpty(location?.CityName) ? $", {location.CityName}" : "";
                        var country = !string.IsNullOrEmpty(location?.CountryName) ? $", {location.CountryName}" : "";
                        var rating = pin.Rating.HasValue ? $" (rated {pin.Rating.Value}/5)" : "";
                        var tagStr = locationTagNamesMap.ContainsKey(pin.LocationId)
                            ? $" Tags: {string.Join(", ", locationTagNamesMap[pin.LocationId].Take(5))}"
                            : "";
                        pinDetails.Add($"{placeName}{city}{country}{rating}{tagStr}");
                    }
                    systemPromptParts.Add($"Here are places the user has saved: {string.Join("; ", pinDetails.Take(10))}.");
                }

                if (userTags.Count > 0)
                {
                    systemPromptParts.Add($"The user is interested in: {string.Join(", ", userTags.Take(15))}.");
                }

                systemPromptParts.Add("Use this information to give personalized, relevant travel advice. Keep responses concise and conversational. If the user asks about places, consider their saved locations and interests. Always be helpful and friendly.");

                var systemPrompt = string.Join(" ", systemPromptParts);

                // Fetch recent conversation history for context
                var history = await _context.AIChatHistories
                    .Where(h => h.UserId == userId)
                    .OrderBy(h => h.Timestamp)
                    .Take(20)
                    .ToListAsync();

                // Build conversation context for Gemini with system prompt
                var allContents = new List<object>
                {
                    new { role = "user", parts = new[] { new { text = systemPrompt } } }
                };

                allContents.AddRange(history.Select(h => new
                {
                    role = h.Role == "user" ? "user" : "model",
                    parts = new[] { new { text = h.Content } }
                }));

                var contents = allContents.ToArray();

                var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={apiKey}";

                var requestBody = new
                {
                    contents = contents
                };

                var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync(url, content);

                string aiResponseText = "Sorry, I couldn't reach the AI service.";

                if (response.IsSuccessStatusCode)
                {
                    var jsonResponse = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(jsonResponse);
                    aiResponseText = doc.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString() ?? aiResponseText;
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"[AiController] Gemini API error: {response.StatusCode} - {errorContent}");
                }

                _context.AIChatHistories.Add(new AIChatHistory
                {
                    UserId = userId!,
                    Role = "ai",
                    Content = aiResponseText,
                    Timestamp = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();

                return Ok(new { response = aiResponseText });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AiController] Error in ChatWithAi: {ex.Message}");
                Console.WriteLine($"[AiController] Stack trace: {ex.StackTrace}");
                return StatusCode(500, new { message = "An internal error occurred while processing your request.", error = ex.Message });
            }
        }
    }
}