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

        // Simple city/location detection from user message
        private string? DetectCityFromMessage(string message, List<Location> allLocations)
        {
            var lowerMessage = message.ToLower();
            // Try to find city or country names from DB in the message
            var matchedLocations = allLocations
                .Where(l => !string.IsNullOrEmpty(l.CityName) && lowerMessage.Contains(l.CityName.ToLower()))
                .ToList();

            if (matchedLocations.Count > 0)
            {
                return matchedLocations.First().CityName;
            }

            matchedLocations = allLocations
                .Where(l => !string.IsNullOrEmpty(l.CountryName) && lowerMessage.Contains(l.CountryName.ToLower()))
                .ToList();

            if (matchedLocations.Count > 0)
            {
                return matchedLocations.First().CountryName;
            }

            return null;
        }

        // Detect category from user message (e.g., "restaurants in Brasov" -> "Restaurant")
        private string? DetectCategoryFromMessage(string message)
        {
            var lowerMessage = message.ToLower();
            
            // Map common category keywords (English + Romanian) to DB category names
            var categoryKeywords = new Dictionary<string, string>
            {
                { "restaurant", "Restaurant" },
                { "restaurants", "Restaurant" },
                { "restaurante", "Restaurant" },
                { "restaurang", "Restaurant" },
                { "mancare", "Restaurant" },
                { "food", "Restaurant" },
                { "dine", "Restaurant" },
                { "cafenea", "Cafe" },
                { "cafenele", "Cafe" },
                { "cafe", "Cafe" },
                { "cafes", "Cafe" },
                { "cofee", "Cafe" },
                { "coffee", "Cafe" },
                { "muzeu", "Museum" },
                { "muzee", "Museum" },
                { "museum", "Museum" },
                { "museums", "Museum" },
                { "parc", "Park" },
                { "parcuri", "Park" },
                { "park", "Park" },
                { "parks", "Park" },
                { "hotel", "Hotel" },
                { "hoteluri", "Hotel" },
                { "hotels", "Hotel" },
                { "atracție", "Attraction" },
                { "atracții", "Attraction" },
                { "attraction", "Attraction" },
                { "attractions", "Attraction" },
                { "shop", "Shop" },
                { "shops", "Shop" },
                { "magazin", "Shop" },
                { "magazine", "Shop" },
                { "shopping", "Shopping" },
                { "nightlife", "Nightlife" },
                { "bar", "Nightlife" },
                { "bars", "Nightlife" },
                { "club", "Nightlife" },
                { "clubs", "Nightlife" },
                { "sport", "Sports" },
                { "sports", "Sports" },
                { "sporturi", "Sports" },
                { "nature", "Nature" },
                { "natură", "Nature" },
                { "landmark", "Landmark" },
                { "monument", "Landmark" },
                { "monumente", "Landmark" },
                { "transport", "Transport" },
                { "accommodation", "Accommodation" },
                { "cazare", "Accommodation" }
            };

            foreach (var (keyword, category) in categoryKeywords)
            {
                if (lowerMessage.Contains(keyword))
                {
                    return category;
                }
            }

            return null;
        }

        // Get locations from DB for a specific city, optionally filtered by category
        private List<string> GetLocationsForCity(string city, string? category, List<Location> allLocations, List<LocationTag> locationTags, Dictionary<int, string> tagMap)
        {
            var cityLocations = allLocations
                .Where(l => !string.IsNullOrEmpty(l.CityName) && l.CityName.ToLower() == city.ToLower())
                .ToList();

            // Filter by category if specified
            if (!string.IsNullOrEmpty(category))
            {
                cityLocations = cityLocations
                    .Where(l => !string.IsNullOrEmpty(l.Category) && l.Category.ToLower() == category.ToLower())
                    .ToList();
            }

            var pinDetails = new List<string>();
            foreach (var loc in cityLocations.Take(15))
            {
                var categoryStr = !string.IsNullOrEmpty(loc.Category) ? $" ({loc.Category})" : "";
                var tags = locationTags
                    .Where(lt => lt.LocationId == loc.Id && tagMap.ContainsKey(lt.TagId))
                    .Select(lt => tagMap[lt.TagId])
                    .Distinct()
                    .Take(3)
                    .ToList();
                var tagStr = tags.Count > 0 ? $" Tags: {string.Join(", ", tags)}" : "";
                pinDetails.Add($"{loc.PlaceName}, {loc.CityName}, {loc.CountryName}{categoryStr}{tagStr}");
            }
            return pinDetails;
        }

        // Call Ollama/Tracey API as fallback
        private async Task<string> CallOllamaAsync(string systemPrompt, string userMessage, List<AIChatHistory> history)
        {
            try
            {
                var ollamaUrl = "http://localhost:11434/api/generate";

                // Build prompt with system prompt + history + current message
                var promptBuilder = new StringBuilder();
                promptBuilder.AppendLine(systemPrompt);
                promptBuilder.AppendLine();

                // Add recent chat history
                if (history.Count > 0)
                {
                    promptBuilder.AppendLine("Recent conversation:");
                    foreach (var h in history.Take(10))
                    {
                        var role = h.Role == "user" ? "User" : "AI";
                        promptBuilder.AppendLine($"{role}: {h.Content}");
                    }
                    promptBuilder.AppendLine();
                }

                promptBuilder.AppendLine($"User: {userMessage}");
                promptBuilder.AppendLine("AI:");

                var requestBody = new
                {
                    model = "tracey",
                    prompt = promptBuilder.ToString(),
                    stream = false
                };

                var content = new StringContent(
                    JsonSerializer.Serialize(requestBody),
                    Encoding.UTF8,
                    "application/json"
                );

                var response = await _httpClient.PostAsync(ollamaUrl, content);

                if (response.IsSuccessStatusCode)
                {
                    var jsonResponse = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(jsonResponse);
                    return doc.RootElement.GetProperty("response").GetString() ?? "Sorry, I couldn't generate a response.";
                }
                else
                {
                    Console.WriteLine($"[AiController] Ollama API error: {response.StatusCode}");
                    return "Sorry, Tracey is not available right now. Please check your connection.";
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AiController] Ollama connection error: {ex.Message}");
                return "Sorry, Tracey is not available right now. Please check your connection.";
            }
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
        public async Task<IActionResult> GetHistory([FromQuery] string? provider = null)
        {
            var (userId, errorResult) = await ExtractAndVerifyTokenAsync();
            if (errorResult != null) return errorResult;

            var query = _context.AIChatHistories.Where(h => h.UserId == userId);

            // Filter by provider if specified
            // Messages with Provider = NULL are treated as "gemini" (legacy messages)
            if (!string.IsNullOrEmpty(provider))
            {
                if (provider == "gemini")
                {
                    // Include explicit "gemini" messages AND NULL (legacy) messages
                    query = query.Where(h => h.Provider == "gemini" || h.Provider == null);
                }
                else if (provider == "tracey")
                {
                    // Only explicit "tracey" messages
                    query = query.Where(h => h.Provider == "tracey");
                }
            }

            var history = await query
                .OrderBy(h => h.Timestamp)
                .ToListAsync();

            var result = history.Select(h => new
            {
                id = h.Id.ToString(),
                sender = h.Role,
                text = h.Content,
                timestamp = h.Timestamp,
                provider = h.Provider ?? "gemini"
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

                // Determine which provider to use
                // If user explicitly selected "tracey", use Tracey directly (no fallback message)
                // Otherwise, default to Gemini with Tracey as fallback
                string requestedProvider = string.IsNullOrWhiteSpace(dto.Provider) ? "gemini" : dto.Provider.ToLower();
                bool isManualTraceySelection = requestedProvider == "tracey";

                _context.AIChatHistories.Add(new AIChatHistory
                {
                    UserId = userId!,
                    Role = "user",
                    Content = dto.Message,
                    Timestamp = DateTime.UtcNow,
                    Provider = isManualTraceySelection ? "tracey" : "gemini"
                });
                await _context.SaveChangesAsync();

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

                // Fetch ALL locations for city detection
                var allLocations = await _context.Locations.ToListAsync();
                var allLocationTags = await _context.LocationTags.ToListAsync();
                var allTagIds = allLocationTags.Select(lt => lt.TagId).Distinct().ToList();
                var allTags = await _context.Tags.Where(t => allTagIds.Contains(t.Id)).ToListAsync();
                var allTagMap = allTags.ToDictionary(t => t.Id, t => t.Name);

                // Build system prompt with user context
                var systemPromptParts = new List<string>();
                if (isManualTraceySelection)
                {
                    systemPromptParts.Add("You are Tracey, a friendly and helpful personal travel assistant for the Tracet app. The user saves pins (places they visit) on the app.");
                }
                else
                {
                    systemPromptParts.Add("You are Gemini, a friendly and helpful personal travel assistant for the Tracet app. The user saves pins (places they visit) on the app.");
                }

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
                        var category = !string.IsNullOrEmpty(location?.Category) ? $" ({location.Category})" : "";
                        var rating = pin.Rating.HasValue ? $" (rated {pin.Rating.Value}/5)" : "";
                        var tagStr = locationTagNamesMap.ContainsKey(pin.LocationId)
                            ? $" Tags: {string.Join(", ", locationTagNamesMap[pin.LocationId].Take(5))}"
                            : "";
                        pinDetails.Add($"{placeName}{city}{country}{category}{rating}{tagStr}");
                    }
                    systemPromptParts.Add($"Here are places the user has saved: {string.Join("; ", pinDetails.Take(10))}.");
                }

                if (userTags.Count > 0)
                {
                    systemPromptParts.Add($"The user is interested in: {string.Join(", ", userTags.Take(15))}.");
                }

                // Detect city and category from message, then add relevant DB locations
                var detectedCity = DetectCityFromMessage(dto.Message, allLocations);
                var detectedCategory = DetectCategoryFromMessage(dto.Message);
                if (!string.IsNullOrEmpty(detectedCity))
                {
                    var cityLocations = GetLocationsForCity(detectedCity, detectedCategory, allLocations, allLocationTags, allTagMap);
                    if (cityLocations.Count > 0)
                    {
                        if (!string.IsNullOrEmpty(detectedCategory))
                        {
                            systemPromptParts.Add($"The user is asking about {detectedCategory} places in {detectedCity}. Here are matching places from our database: {string.Join("; ", cityLocations)}.");
                        }
                        else
                        {
                            systemPromptParts.Add($"Here are places in {detectedCity} from our database: {string.Join("; ", cityLocations)}.");
                        }
                    }
                    else if (!string.IsNullOrEmpty(detectedCategory))
                    {
                        // No exact category match — show all places in the city so AI can still help
                        var allCityLocations = GetLocationsForCity(detectedCity, null, allLocations, allLocationTags, allTagMap);
                        if (allCityLocations.Count > 0)
                        {
                            systemPromptParts.Add($"The user is asking about {detectedCategory} places in {detectedCity}, but we don't have that specific category. Here are all places in {detectedCity} from our database: {string.Join("; ", allCityLocations)}.");
                        }
                    }
                }

                if (isManualTraceySelection)
                {
                    systemPromptParts.Add("Use this information to give personalized, relevant travel advice. Keep responses concise and conversational. If the user asks about places, consider their saved locations and interests. Always be helpful and friendly. Never mention being offline, disconnected, or a fallback assistant — you are Tracey, a regular travel assistant.");
                }
                else
                {
                    systemPromptParts.Add("Use this information to give personalized, relevant travel advice. Keep responses concise and conversational. If the user asks about places, consider their saved locations and interests. Always be helpful and friendly.");
                }

                var systemPrompt = string.Join(" ", systemPromptParts);

                // Fetch recent conversation history — filtered by provider for separate chat histories
                string historyProvider = isManualTraceySelection ? "tracey" : "gemini";
                var history = await _context.AIChatHistories
                    .Where(h => h.UserId == userId && h.Provider == historyProvider)
                    .OrderBy(h => h.Timestamp)
                    .Take(20)
                    .ToListAsync();

                // If user manually selected Tracey, go directly to Ollama (no Gemini, no fallback message)
                if (isManualTraceySelection)
                {
                    Console.WriteLine("[AiController] User manually selected Tracey");
                    string traceyResponse = await CallOllamaAsync(systemPrompt, dto.Message, history);

                    _context.AIChatHistories.Add(new AIChatHistory
                    {
                        UserId = userId!,
                        Role = "ai",
                        Content = traceyResponse,
                        Timestamp = DateTime.UtcNow,
                        Provider = "tracey"
                    });
                    await _context.SaveChangesAsync();

                    return Ok(new { response = traceyResponse, geminiUnavailable = false });
                }

                // Try Gemini — no auto-fallback to Tracey
                // If Gemini fails, tell the user to switch to Tracey manually
                var apiKey = _configuration["GeminiApiKey"];

                if (string.IsNullOrEmpty(apiKey))
                {
                    Console.WriteLine("[AiController] WARNING: GeminiApiKey is not configured!");
                    Console.WriteLine("[AiController] Set GeminiApiKey in appsettings.json or environment variable to use Gemini.");
                    // Don't save user message to history — Gemini couldn't process it
                    // Remove the user message we just saved
                    var lastUserMessage = _context.AIChatHistories
                        .OrderByDescending(h => h.Timestamp)
                        .FirstOrDefault(h => h.UserId == userId && h.Role == "user");
                    if (lastUserMessage != null)
                    {
                        _context.AIChatHistories.Remove(lastUserMessage);
                        await _context.SaveChangesAsync();
                    }
                    return Ok(new 
                    { 
                        response = "Sorry, Gemini is not available right now. Tracey will try to help you while Gemini is away.",
                        geminiUnavailable = true 
                    });
                }

                try
                {
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

                    var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent";

                    var requestBody = new
                    {
                        contents = contents
                    };

                    var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

                    // Set timeout for Gemini request (60 seconds — simulator network can be slow)
                    using var cts = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(60));

                    // New AQ. format API keys require x-goog-api-key header instead of ?key= query param
                    using var requestMessage = new HttpRequestMessage(HttpMethod.Post, url)
                    {
                        Content = content
                    };
                    requestMessage.Headers.Add("x-goog-api-key", apiKey);

                    Console.WriteLine($"[AiController] Calling Gemini API: {url}");
                    var response = await _httpClient.SendAsync(requestMessage, cts.Token);
                    Console.WriteLine($"[AiController] Gemini API response: {response.StatusCode}");

                    if (response.IsSuccessStatusCode)
                    {
                        var jsonResponse = await response.Content.ReadAsStringAsync();
                        using var doc = JsonDocument.Parse(jsonResponse);
                        var aiResponseText = doc.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString() ?? "Sorry, I couldn't generate a response.";

                        // Gemini succeeded — save response as "gemini" provider
                        _context.AIChatHistories.Add(new AIChatHistory
                        {
                            UserId = userId!,
                            Role = "ai",
                            Content = aiResponseText,
                            Timestamp = DateTime.UtcNow,
                            Provider = "gemini"
                        });
                        await _context.SaveChangesAsync();

                        return Ok(new { response = aiResponseText, geminiUnavailable = false });
                    }
                    else
                    {
                        var errorContent = await response.Content.ReadAsStringAsync();
                        Console.WriteLine($"[AiController] Gemini API error: {response.StatusCode} - {errorContent}");

                        // For all Gemini errors, tell user to switch to Tracey manually
                        // Remove the user message we just saved since Gemini couldn't process it
                        var lastUserMessage = _context.AIChatHistories
                            .OrderByDescending(h => h.Timestamp)
                            .FirstOrDefault(h => h.UserId == userId && h.Role == "user");
                        if (lastUserMessage != null)
                        {
                            _context.AIChatHistories.Remove(lastUserMessage);
                            await _context.SaveChangesAsync();
                        }

                        return Ok(new 
                        { 
                            response = "Sorry, Gemini is not available right now. Tracey will try to help you while Gemini is away.",
                            geminiUnavailable = true 
                        });
                    }
                }
                catch (System.Net.Sockets.SocketException ex)
                {
                    Console.WriteLine($"[AiController] Gemini network error (no connection): {ex.Message}");
                    // Remove the user message we just saved
                    var lastUserMessage = _context.AIChatHistories
                        .OrderByDescending(h => h.Timestamp)
                        .FirstOrDefault(h => h.UserId == userId && h.Role == "user");
                    if (lastUserMessage != null)
                    {
                        _context.AIChatHistories.Remove(lastUserMessage);
                        await _context.SaveChangesAsync();
                    }
                    return Ok(new 
                    { 
                        response = "Sorry, Gemini is not available right now. Tracey will try to help you while Gemini is away.",
                        geminiUnavailable = true 
                    });
                }
                catch (System.Threading.Tasks.TaskCanceledException ex)
                {
                    Console.WriteLine($"[AiController] Gemini timeout (no response): {ex.Message}");
                    // Remove the user message we just saved
                    var lastUserMessage = _context.AIChatHistories
                        .OrderByDescending(h => h.Timestamp)
                        .FirstOrDefault(h => h.UserId == userId && h.Role == "user");
                    if (lastUserMessage != null)
                    {
                        _context.AIChatHistories.Remove(lastUserMessage);
                        await _context.SaveChangesAsync();
                    }
                    return Ok(new 
                    { 
                        response = "Sorry, Gemini is not available right now. Tracey will try to help you while Gemini is away.",
                        geminiUnavailable = true 
                    });
                }
                catch (System.IO.IOException ex)
                {
                    Console.WriteLine($"[AiController] Gemini I/O error (no connection): {ex.Message}");
                    // Remove the user message we just saved
                    var lastUserMessage = _context.AIChatHistories
                        .OrderByDescending(h => h.Timestamp)
                        .FirstOrDefault(h => h.UserId == userId && h.Role == "user");
                    if (lastUserMessage != null)
                    {
                        _context.AIChatHistories.Remove(lastUserMessage);
                        await _context.SaveChangesAsync();
                    }
                    return Ok(new 
                    { 
                        response = "Sorry, Gemini is not available right now. Tracey will try to help you while Gemini is away.",
                        geminiUnavailable = true 
                    });
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[AiController] Gemini unexpected error: {ex.Message}");
                    // Remove the user message we just saved
                    var lastUserMessage = _context.AIChatHistories
                        .OrderByDescending(h => h.Timestamp)
                        .FirstOrDefault(h => h.UserId == userId && h.Role == "user");
                    if (lastUserMessage != null)
                    {
                        _context.AIChatHistories.Remove(lastUserMessage);
                        await _context.SaveChangesAsync();
                    }
                    return Ok(new 
                    { 
                        response = "Sorry, Gemini is not available right now. Tracey will try to help you while Gemini is away.",
                        geminiUnavailable = true 
                    });
                }
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