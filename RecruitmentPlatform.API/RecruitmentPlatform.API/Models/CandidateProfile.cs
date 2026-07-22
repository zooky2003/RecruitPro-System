using System.ComponentModel.DataAnnotations;

namespace RecruitmentPlatform.API.Models
{
    public class CandidateProfile
    {
        [Key]
        public int CandidateId { get; set; }
        public int UserId { get; set; } // User table ekata Foreign Key eka
        public string Name { get; set; } = string.Empty;
        public string Skills { get; set; } = string.Empty;
        public string Experience { get; set; } = string.Empty;
        public string CVUrl { get; set; } = string.Empty;

        // Navigation property
        public User? User { get; set; }
    }
}
