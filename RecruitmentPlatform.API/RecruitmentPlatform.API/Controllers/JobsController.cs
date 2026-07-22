using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecruitmentPlatform.API.Data;
using RecruitmentPlatform.API.Models;
using RecruitmentPlatform.API.Services;
using System.Security.Claims;
using System.Text.Json;

namespace RecruitmentPlatform.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class JobsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly GeminiService _geminiService;
        private readonly IConfiguration _config;
        private readonly EmailService _emailService;
        private readonly SmsService _smsService;

        public JobsController(AppDbContext context, GeminiService geminiService, IConfiguration config, EmailService emailService, SmsService smsService)
        {
            _context = context;
            _geminiService = geminiService;
            _config = config;
            _emailService = emailService;
            _smsService = smsService;
        }

        [HttpPost("create")]
        [Authorize(Roles = "Recruiter,Admin")]
        public async Task<IActionResult> CreateJob([FromBody] CreateJobDto dto)
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString) || !int.TryParse(userIdString, out int recruiterId))
            {
                return Unauthorized("User ID not found in token.");
            }

            var department = User.FindFirst("Department")?.Value ?? "General";

            var newJob = new Job
            {
                Title = dto.Title,
                Description = dto.Description,
                Location = dto.Location,
                JobType = dto.JobType,
                PostedDate = DateTime.UtcNow,
                RecruiterId = recruiterId,
                DepartmentName = department
            };

            _context.Jobs.Add(newJob);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Job posted successfully!", jobId = newJob.Id });
        }

        // 🔥 අලුතින් එකතු කළ UPDATE JOB Endpoint එක 🔥
        [HttpPut("update/{jobId}")]
        [Authorize(Roles = "Recruiter,Admin,Hiring Manager,HiringManager")]
        public async Task<IActionResult> UpdateJob(int jobId, [FromBody] CreateJobDto dto)
        {
            var job = await _context.Jobs.FindAsync(jobId);
            if (job == null) return NotFound("Job not found.");

            job.Title = dto.Title;
            job.Description = dto.Description;
            job.Location = dto.Location;
            job.JobType = dto.JobType;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Job updated successfully!" });
        }

        // 🔥 අලුතින් එකතු කළ DELETE JOB Endpoint එක 🔥
        [HttpDelete("delete/{jobId}")]
        [Authorize(Roles = "Recruiter,Admin,Hiring Manager,HiringManager")]
        public async Task<IActionResult> DeleteJob(int jobId)
        {
            var job = await _context.Jobs.FindAsync(jobId);
            if (job == null) return NotFound("Job not found.");

            // වෙනස: ToListAsync() දාලා හරියටම ඩේටා ටික අරගෙන තමයි මකන්න ඕනේ.
            var applications = await _context.Applications.Where(a => a.JobId == jobId).ToListAsync();

            if (applications.Any())
            {
                _context.Applications.RemoveRange(applications);
            }

            _context.Jobs.Remove(job);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                // යම් හෙයකින් එකම බටන් එක දෙපාරක් එබිලා කන්ෆ්ලික්ට් එකක් ආවොත්, සර්වර් එක ක්‍රෑෂ් වෙන්නේ නැති වෙන්න මේක දැම්මා
                return BadRequest("Job was already deleted or modified.");
            }

            return Ok(new { message = "Job and its applications deleted successfully!" });
        }

        [HttpGet("all")]
        public async Task<IActionResult> GetAllJobs()
        {
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            var department = User.FindFirst("Department")?.Value;

            var query = _context.Jobs.AsQueryable();

            if ((role == "Hiring Manager" || role == "Recruiter") && !string.IsNullOrEmpty(department))
            {
                query = query.Where(j => j.DepartmentName == department);
            }

            var jobs = await query
                .OrderByDescending(j => j.PostedDate)
                .ToListAsync();

            return Ok(jobs);
        }

        [HttpPost("apply/{jobId}")]
        [Authorize(Roles = "Candidate")]
        public async Task<IActionResult> ApplyForJob(int jobId)
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString) || !int.TryParse(userIdString, out int candidateId))
            {
                return Unauthorized("User ID not found in token.");
            }

            var job = await _context.Jobs.FindAsync(jobId);
            if (job == null) return NotFound("Job not found.");

            var alreadyApplied = await _context.Applications
                .AnyAsync(a => a.JobId == jobId && a.CandidateId == candidateId);

            if (alreadyApplied) return BadRequest("You have already applied for this job.");

            var candidate = await _context.Users.FindAsync(candidateId);
            var candidateSkills = string.IsNullOrEmpty(candidate?.Skills) ? "No skills provided" : candidate.Skills;
            var jobDescription = string.IsNullOrEmpty(job.Description) ? job.Title : job.Description;

            int matchScore = 0;

            try
            {
                matchScore = (int)await _geminiService.GetMatchScoreAsync(candidateSkills, jobDescription);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Google AI API Unavailable: {ex.Message}. Switching to Local Matching Algorithm.");
                matchScore = CalculateActualMatchScore(candidateSkills, jobDescription);
            }

            var application = new Application
            {
                JobId = jobId,
                CandidateId = candidateId,
                Status = "Pending",
                AppliedAt = DateTime.UtcNow,
                AIScore = matchScore
            };

            _context.Applications.Add(application);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Successfully applied for the job!", matchScore = matchScore });
        }

        [HttpGet("my-applications")]
        [Authorize(Roles = "Candidate")]
        public async Task<IActionResult> GetMyApplications()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString) || !int.TryParse(userIdString, out int candidateId))
            {
                return Unauthorized("User ID not found in token.");
            }

            var myApps = await _context.Applications
                .Where(a => a.CandidateId == candidateId)
                .Join(_context.Jobs,
                    app => app.JobId,
                    job => job.Id,
                    (app, job) => new {
                        app.AppId,
                        JobTitle = job.Title,
                        job.Location,
                        app.Status,
                        app.AppliedAt
                    })
                .OrderByDescending(a => a.AppliedAt)
                .ToListAsync();

            return Ok(myApps);
        }

        [HttpGet("my-posted-jobs")]
        [Authorize(Roles = "Recruiter")]
        public async Task<IActionResult> GetMyPostedJobs()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString) || !int.TryParse(userIdString, out int recruiterId))
            {
                return Unauthorized("User ID not found in token.");
            }

            var myJobs = await _context.Jobs
                .Where(j => j.RecruiterId == recruiterId)
                .OrderByDescending(j => j.PostedDate)
                .ToListAsync();

            return Ok(myJobs);
        }

        [HttpGet("check-models")]
        [AllowAnonymous]
        public async Task<IActionResult> CheckAvailableModels()
        {
            var apiKey = _config["GeminiAI:ApiKey"];
            var url = $"https://generativelanguage.googleapis.com/v1beta/models?key={apiKey}";

            using var httpClient = new HttpClient();
            var response = await httpClient.GetAsync(url);
            var content = await response.Content.ReadAsStringAsync();

            return Content(content, "application/json");
        }

        [HttpGet("applications/{jobId}")]
        [Authorize(Roles = "Recruiter,Admin,Hiring Manager,HiringManager")]
        public async Task<IActionResult> GetApplicationsByJob(int jobId)
        {
            var applications = await _context.Applications
                .Where(a => a.JobId == jobId)
                .Join(_context.Users,
                    app => app.CandidateId,
                    user => user.Id,
                    (app, user) => new {
                        app.AppId,
                        CandidateName = user.FullName,
                        Skills = string.IsNullOrEmpty(user.Skills) ? "No skills provided" : user.Skills,
                        CvFilePath = user.CvFilePath,
                        app.AIScore,
                        app.Status
                    })
                .OrderByDescending(a => a.AIScore)
                .ToListAsync();

            return Ok(applications);
        }

        [HttpDelete("clear-applications")]
        [AllowAnonymous]
        public async Task<IActionResult> ClearApplications()
        {
            _context.Applications.RemoveRange(_context.Applications);
            await _context.SaveChangesAsync();
            return Ok(new { message = "All applications cleared successfully!" });
        }

        [HttpPut("update-status/{appId}")]
        [Authorize(Roles = "Recruiter,Admin,Hiring Manager,HiringManager")]
        public async Task<IActionResult> UpdateApplicationStatus(int appId, [FromBody] UpdateStatusDto request)
        {
            string newStatus = request.Status;
            var validStatuses = new[] { "Pending", "Shortlisted", "Rejected", "Hired" };

            if (!validStatuses.Contains(newStatus))
            {
                return BadRequest("Invalid status. Allowed values: Pending, Shortlisted, Rejected, Hired.");
            }

            var application = await _context.Applications.FindAsync(appId);
            if (application == null) return NotFound("Application not found.");

            application.Status = newStatus;
            await _context.SaveChangesAsync();

            var candidate = await _context.Users.FindAsync(application.CandidateId);
            var job = await _context.Jobs.FindAsync(application.JobId);

            if (candidate != null && job != null && !string.IsNullOrEmpty(candidate.Email))
            {
                var candidateSkills = string.IsNullOrEmpty(candidate.Skills) ? "No skills provided" : candidate.Skills;
                var jobDescription = string.IsNullOrEmpty(job.Description) ? job.Title : job.Description;
                var aiFeedback = await _geminiService.GenerateFeedbackAsync(candidateSkills, jobDescription, newStatus);

                string subject = $"Application Status Update: {job.Title}";

                string managerFeedbackHtml = "";
                if (!string.IsNullOrEmpty(request.Feedback))
                {
                    managerFeedbackHtml = $@"
                    <div style='background-color: #fdf2f8; border-left: 4px solid #db2777; padding: 15px; margin: 20px 0; border-radius: 4px;'>
                        <h4 style='margin-top: 0; color: #831843;'>Message from the Hiring Manager:</h4>
                        <p style='margin-bottom: 0; color: #9d174d; font-style: italic;'>""{request.Feedback}""</p>
                    </div>";
                }

                string body = $@"
                <div style='font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; max-width: 600px;'>
                    <h2 style='color: #6b21a8;'>RecruitPro Update</h2>
                    <p>Dear <b>{candidate.FullName}</b>,</p>
                    <p>We are writing to inform you that the status of your application for the <b>{job.Title}</b> position has been updated.</p>
                    <p style='font-size: 16px;'>Your current status is: <strong style='color: #2563eb; background: #eff6ff; padding: 5px 10px; border-radius: 5px;'>{newStatus}</strong></p>
                    
                    {managerFeedbackHtml}

                    <div style='background-color: #f8fafc; border-left: 4px solid #8b5cf6; padding: 15px; margin: 20px 0; border-radius: 4px;'>
                        <h4 style='margin-top: 0; color: #475569;'>Feedback from our AI Assistant:</h4>
                        <p style='margin-bottom: 0; color: #334155; font-style: italic;'>""{aiFeedback}""</p>
                    </div>

                    <p>Please log in to your Candidate Dashboard for more details.</p>
                    <br/>
                    <p>Best regards,<br/><b>The RecruitPro Team</b></p>
                </div>";

                await _emailService.SendEmailAsync(candidate.Email, subject, body);

                if (!string.IsNullOrEmpty(candidate.PhoneNumber))
                {
                    string smsMessage = newStatus == "Shortlisted"
                        ? $"*RecruitPro Update* 🚀\nHi {candidate.FullName},\nYou have been *Shortlisted* for the {job.Title} position! We will contact you soon for the next steps."
                        : newStatus == "Hired"
                            ? $"*RecruitPro Update* 🎉\nCongratulations {candidate.FullName}!\nYou have been *Hired* for the {job.Title} position."
                            : $"*RecruitPro Update* ℹ️\nHi {candidate.FullName},\nYour application status for {job.Title} is now: {newStatus}.";

                    _smsService.SendSms(candidate.PhoneNumber, smsMessage);
                }
            }

            return Ok(new { message = $"Application status updated to {newStatus} successfully!" });
        }

        [HttpGet("dashboard-stats")]
        [Authorize(Roles = "Recruiter,Admin")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            var department = User.FindFirst("Department")?.Value;

            var appsQuery = _context.Applications.AsQueryable();

            if (role == "Recruiter" && !string.IsNullOrEmpty(department))
            {
                var myDepartmentJobIds = _context.Jobs.Where(j => j.DepartmentName == department).Select(j => j.Id);
                appsQuery = appsQuery.Where(a => myDepartmentJobIds.Contains(a.JobId));
            }

            var statusStats = await appsQuery
                .GroupBy(a => a.Status)
                .Select(g => new {
                    Status = g.Key,
                    Count = g.Count()
                })
                .ToListAsync();

            var scoreStats = await appsQuery
                .Select(a => new { a.AIScore })
                .ToListAsync();

            return Ok(new
            {
                statusDistribution = statusStats,
                scoreDistribution = scoreStats
            });
        }

        [HttpPost("schedule-interview")]
        [Authorize(Roles = "Recruiter,Admin")]
        public async Task<IActionResult> ScheduleInterview([FromBody] ScheduleInterviewDto dto)
        {
            var application = await _context.Applications.FindAsync(dto.AppId);
            if (application == null) return NotFound("Application not found.");

            var candidate = await _context.Users.FindAsync(application.CandidateId);
            var job = await _context.Jobs.FindAsync(application.JobId);

            if (candidate != null && job != null && !string.IsNullOrEmpty(candidate.Email))
            {
                string subject = $"Interview Scheduled: {job.Title}";
                string body = $@"
                <div style='font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; max-width: 600px;'>
                    <h2 style='color: #2563eb;'>Interview Invitation</h2>
                    <p>Dear <b>{candidate.FullName}</b>,</p>
                    <p>We are pleased to invite you to an interview for the <b>{job.Title}</b> position.</p>
                    <div style='background: #eff6ff; padding: 15px; border-radius: 5px; margin: 15px 0;'>
                        <p style='margin: 0 0 10px 0;'><b>📅 Date:</b> {dto.Date}</p>
                        <p style='margin: 0 0 10px 0;'><b>⏰ Time:</b> {dto.Time}</p>
                        <p style='margin: 0;'><b>📍 Type:</b> {dto.Type}</p>
                    </div>
                    <p>Please be ready 5 minutes early. Best of luck!</p>
                    <br/>
                    <p>Best regards,<br/><b>The RecruitPro Team</b></p>
                </div>";

                await _emailService.SendEmailAsync(candidate.Email, subject, body);

                if (!string.IsNullOrEmpty(candidate.PhoneNumber))
                {
                    string smsMessage = $"*RecruitPro Interview* 📅\nHi {candidate.FullName},\nAn interview for *{job.Title}* has been scheduled.\n\nDate: {dto.Date}\nTime: {dto.Time}\nType: {dto.Type}\n\nPlease check your email for more details.";
                    _smsService.SendSms(candidate.PhoneNumber, smsMessage);
                }
            }

            return Ok(new { message = "Interview scheduled and email sent successfully!" });
        }

        [HttpGet("recommended")]
        [Authorize(Roles = "Candidate")]
        public async Task<IActionResult> GetRecommendedJobs()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString) || !int.TryParse(userIdString, out int candidateId))
                return Unauthorized("User ID not found in token.");

            var candidate = await _context.Users.FindAsync(candidateId);

            if (candidate == null || string.IsNullOrEmpty(candidate.Skills))
                return Ok(new List<object>());

            var availableJobs = await _context.Jobs.Select(j => new { j.Id, j.Title, j.Description, j.Location }).ToListAsync();
            if (!availableJobs.Any()) return Ok(new List<object>());

            var jobsJson = JsonSerializer.Serialize(availableJobs);
            var aiResponseJson = await _geminiService.GenerateJobRecommendationsAsync(candidate.Skills, jobsJson);

            try
            {
                var recommendations = JsonSerializer.Deserialize<List<AIJobRecommendationDto>>(aiResponseJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (recommendations == null) return Ok(new List<object>());

                var recommendedJobsDetails = recommendations.Join(availableJobs,
                    r => r.JobId,
                    j => j.Id,
                    (r, j) => new {
                        j.Id,
                        j.Title,
                        j.Location,
                        Reason = r.Reason
                    }).ToList();

                return Ok(recommendedJobsDetails);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error parsing AI recommendations: {ex.Message}");
                return Ok(new List<object>());
            }
        }

        private int CalculateActualMatchScore(string candidateSkills, string jobDescription)
        {
            if (string.IsNullOrWhiteSpace(candidateSkills) || string.IsNullOrWhiteSpace(jobDescription))
                return 20;

            var skillsList = candidateSkills.ToLower().Split(new[] { ',', ' ', '\n', '\r', '.' }, StringSplitOptions.RemoveEmptyEntries);
            var jobWordsList = jobDescription.ToLower().Split(new[] { ',', ' ', '\n', '\r', '.' }, StringSplitOptions.RemoveEmptyEntries);

            var stopWords = new HashSet<string> { "and", "or", "the", "with", "in", "for", "of", "experience", "skills", "required", "to", "a", "an", "is", "are" };

            var validJobWords = jobWordsList.Where(w => !stopWords.Contains(w) && w.Length > 2).ToHashSet();
            var validSkills = skillsList.Where(w => !stopWords.Contains(w) && w.Length > 2).ToHashSet();

            if (validSkills.Count == 0) return 30;

            int matchCount = 0;
            foreach (var skill in validSkills)
            {
                if (validJobWords.Contains(skill))
                {
                    matchCount++;
                }
            }

            double score = ((double)matchCount / validSkills.Count) * 100;

            score = score * 1.5;
            if (score > 98) score = 98;
            if (score < 25) score = 25;

            return (int)score;
        }
    }

    public class CreateJobDto
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string JobType { get; set; } = string.Empty;
    }

    public class ScheduleInterviewDto
    {
        public int AppId { get; set; }
        public string Date { get; set; } = string.Empty;
        public string Time { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
    }

    public class AIJobRecommendationDto
    {
        public int JobId { get; set; }
        public string Reason { get; set; } = string.Empty;
    }

    public class UpdateStatusDto
    {
        public string Status { get; set; } = string.Empty;
        public string? Feedback { get; set; }
        public string? Score { get; set; }
    }
}