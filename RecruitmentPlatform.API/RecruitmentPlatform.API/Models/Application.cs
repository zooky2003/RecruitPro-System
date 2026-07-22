using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema; // Meka add karanna

namespace RecruitmentPlatform.API.Models
{
    public class Application
    {
        [Key]
        public int AppId { get; set; }
        public int CandidateId { get; set; }
        public int JobId { get; set; }
        public string Status { get; set; } = "Pending";
        public DateTime AppliedAt { get; set; } = DateTime.UtcNow;

        [Column(TypeName = "decimal(18,2)")] // Meka add karanna
        public decimal AIScore { get; set; }
    }
}