using System.ComponentModel.DataAnnotations;

namespace RecruitmentPlatform.API.Models
{
    public class JobPosting
    {
        [Key]
        public int JobId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string RequiredSkills { get; set; } = string.Empty;
        public int PostedBy { get; set; } // User ID of the Recruiter
        public string Status { get; set; } = "Open"; // Open, Closed
    }
}
