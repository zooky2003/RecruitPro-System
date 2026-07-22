namespace RecruitmentPlatform.API.Models
{
    public class User
    {
        public int Id { get; set; }

        public string FullName { get; set; }

        public string Email { get; set; }

        public string Password { get; set; }

        public DateTime Birthday { get; set; }

        // Frontend eken ewath nathath, backend eken default "Candidate" set wenawa
        public string Role { get; set; } = "Candidate";
        public string? PhoneNumber { get; set; }
        public string? Skills { get; set; }
        
        public string? Headline { get; set; } // උදා: "Freelance Software Developer"
        public string? Education { get; set; } // උදා: "Computer Science Undergraduate at NSBM"
        public string? Experience { get; set; }
        public string? GitHubLink { get; set; }
        public string? LinkedInLink { get; set; }

        public string? DepartmentName { get; set; } = "General";
        public string? CvFilePath { get; set; }
    }
}