namespace RecruitmentPlatform.API.Models
{
    public class Job
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string JobType { get; set; } = string.Empty; // Full-time, Part-time, Contract etc.
        public DateTime PostedDate { get; set; } = DateTime.UtcNow;
        public int RecruiterId { get; set; } // මේ Job එක Post කරපු Recruiter ගේ ID එක
        public string? DepartmentName { get; set; } = "General";
    }
}