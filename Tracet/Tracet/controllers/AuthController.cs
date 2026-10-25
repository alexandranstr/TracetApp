using FirebaseAdmin.Auth;
using Microsoft.AspNetCore.Authorization;
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

    public AuthController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
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
            FirebaseToken decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);
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
            if (user != null)
            {
                _dbContext.Users.Remove(user);
                await _dbContext.SaveChangesAsync();
            }
            try
            {
                await FirebaseAuth.DefaultInstance.DeleteUserAsync(uid);
            }
            catch (FirebaseAuthException)
            {
                
            }

            return Ok(new { message = "User account removed successfully." });
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
}