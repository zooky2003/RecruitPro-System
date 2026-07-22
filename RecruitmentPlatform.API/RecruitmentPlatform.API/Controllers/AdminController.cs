using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecruitmentPlatform.API.Data;

namespace RecruitmentPlatform.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")] // 🔥 Admin ට විතරක් බලන්න පුළුවන් වෙන්න හදලා තියෙන්නේ
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AdminController(AppDbContext context)
        {
            _context = context;
        }

        // 🔥 ඇත්ත Analytics Data ගන්න API එක
        [HttpGet("analytics")]
        public async Task<IActionResult> GetSystemAnalytics()
        {
            try
            {
                var totalUsers = await _context.Users.CountAsync();
                var activeJobs = await _context.Jobs.CountAsync();
                var totalApplications = await _context.Applications.CountAsync();

                return Ok(new
                {
                    TotalUsers = totalUsers,
                    ActiveJobs = activeJobs,
                    AiMatches = totalApplications
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}