using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tracet.data;
using Tracet.models;

namespace Tracet.controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TagsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TagsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetTags()
        {
            var tags = await _context.Tags
                .OrderBy(t => t.Id)
                .Select(t => new { t.Id, t.Name })
                .ToListAsync();

            return Ok(tags);
        }
    }
}