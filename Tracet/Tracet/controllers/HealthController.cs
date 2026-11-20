using Microsoft.AspNetCore.Mvc;
using Tracet.data;

namespace Tracet.controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public HealthController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            status = "healthy",
            timestamp = DateTime.UtcNow,
            database = "connected",
            version = "1.0.0"
        });
    }

    [HttpGet("ready")]
    public async Task<IActionResult> Ready()
    {
        try
        {
            await _dbContext.Database.CanConnectAsync();
            return Ok(new
            {
                status = "ready",
                database = "connected",
                timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            return StatusCode(503, new
            {
                status = "unhealthy",
                database = "disconnected",
                error = ex.Message,
                timestamp = DateTime.UtcNow
            });
        }
    }
}
