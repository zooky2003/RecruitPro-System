using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecruitmentPlatform.API.Data;
using RecruitmentPlatform.API.Models;

namespace RecruitmentPlatform.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DepartmentsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DepartmentsController(AppDbContext context)
        {
            _context = context;
        }

        // 1. Get all departments
        [HttpGet("all")]
        [Authorize(Roles = "Admin,Recruiter,Hiring Manager")]
        public async Task<IActionResult> GetAllDepartments()
        {
            var departments = await _context.Departments.ToListAsync();
            return Ok(departments);
        }

        // 2. Create a new department
        [HttpPost("create")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateDepartment([FromBody] CreateDepartmentDto dto)
        {
            var newDept = new Department
            {
                Name = dto.Name,
                HeadOfDepartment = dto.HeadOfDepartment,
                EmployeeCount = 0
            };

            _context.Departments.Add(newDept);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Department created successfully!", department = newDept });
        }
    }

    public class CreateDepartmentDto
    {
        public string Name { get; set; } = string.Empty;
        public string HeadOfDepartment { get; set; } = string.Empty;
    }
}