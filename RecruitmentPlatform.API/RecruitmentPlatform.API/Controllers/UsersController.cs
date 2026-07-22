using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RecruitmentPlatform.API.Data;
using RecruitmentPlatform.API.Models;
using RecruitmentPlatform.API.Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using UglyToad.PdfPig;

namespace RecruitmentPlatform.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly GeminiService _geminiService;

        public UsersController(AppDbContext context, IConfiguration configuration, GeminiService geminiService)
        {
            _context = context;
            _configuration = configuration;
            _geminiService = geminiService;
        }

        // CV Parse API
        [HttpPost("parse-cv")]
        [Authorize]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> ParseCv(IFormFile cvFile)
        {
            if (cvFile == null || cvFile.Length == 0)
                return BadRequest("No file uploaded.");

            if (Path.GetExtension(cvFile.FileName).ToLower() != ".pdf")
                return BadRequest("Only PDF files are supported for parsing.");

            try
            {
                string resumeText = "";

                using (var stream = cvFile.OpenReadStream())
                using (var pdfDocument = PdfDocument.Open(stream))
                {
                    foreach (var page in pdfDocument.GetPages())
                    {
                        resumeText += page.Text + " ";
                    }
                }

                if (string.IsNullOrWhiteSpace(resumeText))
                    return BadRequest("Could not extract text from the PDF. Is it an image-based PDF?");

                var parsedJsonString = await _geminiService.ParseResumeAsync(resumeText);
                return Content(parsedJsonString, "application/json");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error parsing CV: {ex.Message}");
            }
        }

        // 1. Login Endpoint
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email && u.Password == dto.Password);

            if (user == null)
            {
                return Unauthorized("Invalid email or password.");
            }

            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"] ?? "MySuperSecretKeyForJwtAuthentication123!");

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Role, user.Role),
                    new Claim(ClaimTypes.Name, user.FullName),
                    new Claim("Department", user.DepartmentName ?? "General") // 🔥 Department එක Token එකට දැම්මා
                }),
                Expires = DateTime.UtcNow.AddHours(2),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            var tokenString = tokenHandler.WriteToken(token);

            return Ok(new
            {
                message = "Login successful",
                token = tokenString,
                role = user.Role
            });
        }

        // 2. Register Endpoint
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (existingUser != null)
            {
                return BadRequest("User with this email already exists.");
            }

            var newUser = new User
            {
                FullName = dto.FullName,
                Email = dto.Email,
                Password = dto.Password,
                Role = "Candidate",
                Birthday = dto.Birthday
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Registration successful!" });
        }

        // 3. Create Staff Endpoint (Admin Only)
        [HttpPost("create-staff")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateStaff([FromBody] CreateStaffDto dto)
        {
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (existingUser != null)
            {
                return BadRequest("User with this email already exists.");
            }

            var newUser = new User
            {
                FullName = dto.FullName,
                Email = dto.Email,
                Password = dto.Password,
                Role = dto.Role,
                Birthday = dto.Birthday,
                DepartmentName = dto.DepartmentName // 🔥 Department එක සේව් වෙනවා
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"{dto.Role} created successfully!" });
        }

        // 4. Get Current Profile
        [HttpGet("profile")]
        [Authorize]
        public async Task<IActionResult> GetProfile()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString) || !int.TryParse(userIdString, out int userId))
                return Unauthorized("User ID not found in token.");

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound("User not found.");

            return Ok(new
            {
                phoneNumber = user.PhoneNumber,
                skills = user.Skills,
                headline = user.Headline,
                education = user.Education,
                experience = user.Experience,
                gitHubLink = user.GitHubLink,
                linkedInLink = user.LinkedInLink,
                cvFilePath = user.CvFilePath
            });
        }

        // 5. Update Profile & Upload CV
        [HttpPost("update-profile")]
        [Authorize]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UpdateProfile([FromForm] CandidateProfileUpdateDto dto)
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString) || !int.TryParse(userIdString, out int userId))
            {
                return Unauthorized("User ID not found in token.");
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound("User not found.");

            if (!string.IsNullOrEmpty(dto.PhoneNumber)) user.PhoneNumber = dto.PhoneNumber;
            if (!string.IsNullOrEmpty(dto.Skills)) user.Skills = dto.Skills;
            if (!string.IsNullOrEmpty(dto.Headline)) user.Headline = dto.Headline;
            if (!string.IsNullOrEmpty(dto.Education)) user.Education = dto.Education;
            if (!string.IsNullOrEmpty(dto.Experience)) user.Experience = dto.Experience;
            if (!string.IsNullOrEmpty(dto.GitHubLink)) user.GitHubLink = dto.GitHubLink;
            if (!string.IsNullOrEmpty(dto.LinkedInLink)) user.LinkedInLink = dto.LinkedInLink;

            if (dto.CvFile != null && dto.CvFile.Length > 0)
            {
                var extension = Path.GetExtension(dto.CvFile.FileName).ToLower();
                if (extension != ".pdf") return BadRequest("Only PDF files are allowed.");

                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
                if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

                var uniqueFileName = $"{userId}_cv_{Guid.NewGuid().ToString().Substring(0, 8)}{extension}";
                var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await dto.CvFile.CopyToAsync(stream);
                }
                user.CvFilePath = $"/uploads/{uniqueFileName}";
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Profile updated successfully!", cvPath = user.CvFilePath });
        }

        // 6. Get All Candidates
        [HttpGet("candidates")]
        [Authorize(Roles = "Admin,Recruiter")]
        public async Task<IActionResult> GetCandidates()
        {
            var candidates = await _context.Users
                .Where(u => u.Role == "Candidate")
                .Select(u => new {
                    u.Id,
                    u.FullName,
                    u.Email,
                    u.PhoneNumber,
                    u.Skills,
                    u.CvFilePath,
                    u.Headline,
                    u.Education,
                    u.Experience,
                    u.GitHubLink,
                    u.LinkedInLink
                })
                .ToListAsync();

            return Ok(candidates);
        }

        // 🔥 7. Get All Staff (Admin Only - Candidates ලා නැතුව Staff විතරක් ගන්නවා) 🔥
        [HttpGet("staff")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetStaff()
        {
            var staff = await _context.Users
                .Where(u => u.Role == "Admin" || u.Role == "Recruiter" || u.Role == "Hiring Manager")
                .Select(u => new {
                    u.Id,
                    u.FullName,
                    u.Email,
                    u.Role,
                    u.DepartmentName
                })
                .ToListAsync();

            return Ok(staff);
        }

        // 🔥 8. Revoke/Delete User (Admin Only) 🔥
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound("User not found.");

            // Admin ව delete කරන එක නවත්තනවා (Safety)
            if (user.Email == "admin@recruitpro.com")
                return BadRequest("Cannot delete the main system administrator.");

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "User access revoked successfully." });
        }
    }

    // --- DTO Classes ---
    public class LoginDto { public string Email { get; set; } = string.Empty; public string Password { get; set; } = string.Empty; }
    public class RegisterDto { public string FullName { get; set; } = string.Empty; public string Email { get; set; } = string.Empty; public string Password { get; set; } = string.Empty; public DateTime Birthday { get; set; } }
    public class CreateStaffDto { public string FullName { get; set; } = string.Empty; public string Email { get; set; } = string.Empty; public string Password { get; set; } = string.Empty; public string Role { get; set; } = string.Empty; public DateTime Birthday { get; set; } public string DepartmentName { get; set; } = string.Empty; }
    public class CandidateProfileUpdateDto
    {
        public string? PhoneNumber { get; set; }
        public string? Skills { get; set; }
        public IFormFile? CvFile { get; set; }
        public string? Headline { get; set; }
        public string? Education { get; set; }
        public string? Experience { get; set; }
        public string? GitHubLink { get; set; }
        public string? LinkedInLink { get; set; }
    }
}