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
    }
}