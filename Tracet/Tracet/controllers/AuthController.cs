using FirebaseAdmin.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Tracet.data;
using Tracet.models;
using Tracet.DTOs;

namespace Tracet.controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly IWebHostEnvironment _environment;

    public AuthController(AppDbContext dbContext, IWebHostEnvironment environment)
    {
        _dbContext = dbContext;
        _environment = environment;
    }
    
    private async Task<(string? Uid, FirebaseToken? DecodedToken, IActionResult? ErrorResult)> ExtractAndVerifyTokenAsync()
    {
        var authHeader = Request.Headers["Authorization"].FirstOrDefault();
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return (null, null, Unauthorized(new { message = "Missing or invalid Authorization header." }));
        }

        var idToken = authHeader.Substring("Bearer ".Length).Trim();

        try
        {
            FirebaseToken decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken, checkRevoked: true);
            return (decodedToken.Uid, decodedToken, null);
        }
        catch (FirebaseAuthException ex)
        {
            return (null, null, Unauthorized(new { message = "Invalid or expired token.", error = ex.Message }));
        }
        catch (Exception ex)
        {
            return (null, null, StatusCode(500, new { message = "Authentication error.", error = ex.Message }));
        }
    }

    [HttpPost("sync")]
    public async Task<IActionResult> SyncUser()
    {
        var (uid, decodedToken, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        try
        {
            decodedToken!.Claims.TryGetValue("email", out var emailObj);
            decodedToken.Claims.TryGetValue("name", out var nameObj);

            string email = emailObj?.ToString() ?? string.Empty;
            string displayName = nameObj?.ToString() ?? string.Empty;

            var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == uid);

            if (user == null)
            {
                user = new User
                {
                    Id = uid!,
                    Email = email,
                    DisplayName = displayName,
                    Username = string.Empty,
                    PhotoUrl = null,
                    HomeCountry = null,
                    PhoneNumber = null,
                    IsTwoFactorEnabled = false,
                    IsPhoneVerified = false,
                    CreatedAt = DateTime.UtcNow
                };

                _dbContext.Users.Add(user);
            }
            else
            {
                user.Email = email;
                if (!string.IsNullOrEmpty(displayName) && string.IsNullOrEmpty(user.DisplayName))
                {
                    user.DisplayName = displayName;
                }
            }

            await _dbContext.SaveChangesAsync();
            return Ok(user);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Server error processing authentication.", error = ex.Message });
        }
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var (uid, _, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == uid);
        if (user == null) return NotFound(new { message = "User not found." });

        return Ok(user);
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
    {
        var (uid, _, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == uid);
        if (user == null) return NotFound(new { message = "User not found." });

        if (!string.IsNullOrWhiteSpace(dto.Username))
        {
            string cleanUsername = dto.Username.Trim().ToLower().Replace(" ", "_");

            if (cleanUsername.Length < 3 || cleanUsername.Length > 30)
            {
                return BadRequest(new { message = "Username must be between 3 and 30 characters." });
            }

            bool isTaken = await _dbContext.Users.AnyAsync(u => u.Username == cleanUsername && u.Id != uid);
            if (isTaken)
            {
                return BadRequest(new { message = "Username is already taken." });
            }
            user.Username = cleanUsername;
        }

        if (!string.IsNullOrWhiteSpace(dto.DisplayName))
        {
            user.DisplayName = dto.DisplayName.Trim();
        }

        if (dto.PhotoUrl != null)
        {
            user.PhotoUrl = string.IsNullOrWhiteSpace(dto.PhotoUrl) ? null : dto.PhotoUrl.Trim();
        }

        if (dto.PhoneNumber != null)
        {
            user.PhoneNumber = string.IsNullOrWhiteSpace(dto.PhoneNumber) ? null : dto.PhoneNumber.Trim();
            user.IsPhoneVerified = !string.IsNullOrWhiteSpace(user.PhoneNumber);
        }

        if (dto.HomeCountry != null)
        {
            user.HomeCountry = dto.HomeCountry;
        }

        await _dbContext.SaveChangesAsync();
        return Ok(user);
    }

    [HttpPut("toggle-2fa")]
    public async Task<IActionResult> ToggleTwoFactor([FromBody] ToggleTwoFactorDto dto)
    {
        var (uid, _, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == uid);
        if (user == null) return NotFound(new { message = "User not found." });

        if (dto.Enable)
        {
            if (string.IsNullOrWhiteSpace(user.PhoneNumber) || !user.IsPhoneVerified)
            {
                return BadRequest(new { message = "Please add and verify a phone number before enabling 2FA." });
            }
        }

        user.IsTwoFactorEnabled = dto.Enable;
        await _dbContext.SaveChangesAsync();

        return Ok(new { isTwoFactorEnabled = user.IsTwoFactorEnabled });
    }

    [HttpDelete("account")]
    public async Task<IActionResult> DeleteAccount()
    {
        var (uid, _, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        try
        {
            var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == uid);
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            // Delete all AI chat history entries for this user
            var aiChatHistories = await _dbContext.AIChatHistories.Where(h => h.UserId == uid).ToListAsync();
            _dbContext.AIChatHistories.RemoveRange(aiChatHistories);

            // Delete all pins for this user
            var pins = await _dbContext.Pins.Where(p => p.UserId == uid).ToListAsync();
            
            // Delete pin photo files from disk and Firebase Storage
            foreach (var pin in pins)
            {
                if (!string.IsNullOrEmpty(pin.PhotoUrlsJson))
                {
                    try
                    {
                        var photoUrls = System.Text.Json.JsonSerializer.Deserialize<string[]>(pin.PhotoUrlsJson);
                        if (photoUrls != null)
                        {
                            foreach (var photoUrl in photoUrls)
                            {
                                if (string.IsNullOrEmpty(photoUrl)) continue;
                                
                                // Delete from disk if it's a local file
                                if (photoUrl.StartsWith("/uploads/"))
                                {
                                    var fileName = System.IO.Path.GetFileName(photoUrl);
                                    var directoryPath = System.IO.Path.Combine(_environment.ContentRootPath, "uploads", photoUrl.Replace("/uploads/", "").Replace('/', System.IO.Path.DirectorySeparatorChar));
                                    if (System.IO.File.Exists(directoryPath))
                                    {
                                        System.IO.File.Delete(directoryPath);
                                        Console.WriteLine($"[AuthController] Deleted pin photo from disk: {directoryPath}");
                                    }
                                }
                                // Delete from Firebase Storage if it's a Firebase URL
                                else if (photoUrl.StartsWith("http://") || photoUrl.StartsWith("https://"))
                                {
                                    try
                                    {
                                        await DeleteFromFirebaseStorageAsync(photoUrl);
                                    }
                                    catch (Exception ex)
                                    {
                                        Console.WriteLine($"[AuthController] Error deleting from Firebase Storage: {ex.Message}");
                                    }
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[AuthController] Error deleting pin photos: {ex.Message}");
                    }
                }
            }
            
            _dbContext.Pins.RemoveRange(pins);

            // Delete all messages sent by this user (including image messages)
            var messages = await _dbContext.Messages.Where(m => m.SenderId == uid).ToListAsync();
            
            // Delete chat image files from disk and Firebase Storage
            foreach (var msg in messages)
            {
                if (!string.IsNullOrEmpty(msg.ImageUrl))
                {
                    try
                    {
                        // Delete from disk if it's a local file
                        if (msg.ImageUrl.StartsWith("/uploads/"))
                        {
                            var filePath = System.IO.Path.Combine(_environment.ContentRootPath, msg.ImageUrl.Replace("/", System.IO.Path.DirectorySeparatorChar.ToString()));
                            if (System.IO.File.Exists(filePath))
                            {
                                System.IO.File.Delete(filePath);
                                Console.WriteLine($"[AuthController] Deleted chat image from disk: {filePath}");
                            }
                        }
                        // Delete from Firebase Storage if it's a Firebase URL
                        else if (msg.ImageUrl.StartsWith("http://") || msg.ImageUrl.StartsWith("https://"))
                        {
                            try
                            {
                                await DeleteFromFirebaseStorageAsync(msg.ImageUrl);
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"[AuthController] Error deleting from Firebase Storage: {ex.Message}");
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[AuthController] Error deleting chat image: {ex.Message}");
                    }
                }
            }
            
            _dbContext.Messages.RemoveRange(messages);

            // Delete all conversations where this user is a participant
            var conversations = await _dbContext.Conversations.Where(c => c.User1Id == uid || c.User2Id == uid).ToListAsync();
            _dbContext.Conversations.RemoveRange(conversations);

            // Delete all friendships involving this user (both as user and as friend)
            var friendships = await _dbContext.Friendships.Where(f => f.UserId == uid || f.FriendId == uid).ToListAsync();
            _dbContext.Friendships.RemoveRange(friendships);

            // Now delete the user
            _dbContext.Users.Remove(user);
            await _dbContext.SaveChangesAsync();

            // Delete from Firebase Auth
            try
            {
                await FirebaseAuth.DefaultInstance.DeleteUserAsync(uid);
            }
            catch (FirebaseAuthException)
            {
                // User may not exist in Firebase, ignore
            }

            return Ok(new { message = "User account and all associated data removed successfully." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error deleting account.", error = ex.Message });
        }
    }

    [HttpGet("resolve-email")]
    public async Task<IActionResult> ResolveEmail([FromQuery] string username)
    {
        var (_, _, errorResult) = await ExtractAndVerifyTokenAsync();
        if (errorResult != null) return errorResult;

        if (string.IsNullOrWhiteSpace(username))
            return BadRequest(new { message = "Username required." });

        var cleanUsername = username.Trim().TrimStart('@').ToLower();

        var user = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Username != null && u.Username.ToLower() == cleanUsername);

        if (user == null || string.IsNullOrEmpty(user.Email))
            return NotFound(new { message = "User not found." });

        return Ok(new { email = user.Email });
    }

    /// <summary>
    /// Delete a file from Firebase Storage using the REST API.
    /// Extracts the path from the Firebase Storage download URL and sends DELETE request.
    /// </summary>
    private async Task DeleteFromFirebaseStorageAsync(string downloadUrl)
    {
        try
        {
            // Parse the path from the Firebase Storage URL
            // URL format: https://firebasestorage.googleapis.com/v/b/<bucket>/o/<encoded-path>?...
            var uri = new Uri(downloadUrl);
            var pathParts = uri.AbsolutePath.Split('/');
            var oIndex = Array.IndexOf(pathParts, "o");
            if (oIndex < 0 || oIndex >= pathParts.Length - 1)
            {
                Console.WriteLine($"[AuthController] Could not extract path from Firebase URL: {downloadUrl}");
                return;
            }

            var encodedPath = string.Join("/", pathParts.Skip(oIndex + 1));
            var decodedPath = System.Net.WebUtility.UrlDecode(encodedPath);
            
            Console.WriteLine($"[AuthController] Deleting from Firebase Storage: {decodedPath}");

            // Use Firebase Storage REST API to delete the object
            var bucketIndex = Array.IndexOf(pathParts, "b");
            if (bucketIndex < 0 || bucketIndex >= pathParts.Length - 1) return;
            
            var bucket = pathParts[bucketIndex + 1];
            var deleteUrl = $"https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{System.Net.WebUtility.UrlEncode(decodedPath)}";

            using (var client = new System.Net.Http.HttpClient())
            {
                var request = new System.Net.Http.HttpRequestMessage(System.Net.Http.HttpMethod.Delete, deleteUrl);
                var response = await client.SendAsync(request);
                
                if (response.IsSuccessStatusCode || response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    Console.WriteLine($"[AuthController] Deleted from Firebase Storage: {decodedPath}");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AuthController] Could not delete from Firebase Storage: {ex.Message}");
        }
    }
}