using FirebaseAdmin.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tracet.data;
using Tracet.models;

namespace Tracet.controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public AuthController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpPost("sync")]
    public async Task<IActionResult> SyncUser()
    {
        var authHeader = Request.Headers["Authorization"].FirstOrDefault();
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
        {
            return Unauthorized(new { message = "Missing or invalid Authorization header." });
        }

        var idToken = authHeader.Substring("Bearer ".Length).Trim();

        try
        {
            FirebaseToken decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);
            string uid = decodedToken.Uid;

            decodedToken.Claims.TryGetValue("email", out var emailObj);
            decodedToken.Claims.TryGetValue("name", out var nameObj);

            string email = emailObj?.ToString() ?? string.Empty;
            string displayName = nameObj?.ToString() ?? string.Empty;

            var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == uid);

            if (user == null)
            {
                user = new User
                {
                    Id = uid,
                    Email = email,
                    DisplayName = displayName,
                    Username = string.Empty,
                    PhotoUrl = null,
                    HomeCountry = null,
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
        catch (FirebaseAuthException ex)
        {
            return Unauthorized(new { message = "Invalid token.", error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Server error processing authentication.", error = ex.Message });
        }
    }
    
    public class UpdateProfileDto
    {
        public string DisplayName { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string? HomeCountry { get; set; }
        public string? PhotoUrl { get; set; }
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
    {
        var authHeader = Request.Headers["Authorization"].FirstOrDefault();
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
        {
            return Unauthorized(new { message = "Missing authorization token." });
        }

        var idToken = authHeader.Substring("Bearer ".Length).Trim();

        try
        {
            FirebaseToken decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);
            string uid = decodedToken.Uid;

            var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == uid);
            if (user == null) return NotFound(new { message = "User not found." });

            string cleanUsername = dto.Username.Trim().ToLower().Replace(" ", "_");

            bool isTaken = await _dbContext.Users.AnyAsync(u => u.Username == cleanUsername && u.Id != uid);
            if (isTaken)
            {
                return BadRequest(new { message = "Username is already taken." });
            }

            user.DisplayName = dto.DisplayName.Trim();
            user.Username = cleanUsername;
            user.HomeCountry = dto.HomeCountry;
            if (!string.IsNullOrEmpty(dto.PhotoUrl)) user.PhotoUrl = dto.PhotoUrl;

            await _dbContext.SaveChangesAsync();
            return Ok(user);
        }
        catch (FirebaseAuthException)
        {
            return Unauthorized(new { message = "Invalid token." });
        }
    }
}

