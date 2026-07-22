using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema; // Meka add karanna

namespace RecruitmentPlatform.API.Models
{
    public class Interview
    {
        [Key]
        public int InterviewId { get; set; }
        public int AppId { get; set; }
        public DateTime ScheduledAt { get; set; }
        public string Feedback { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")] // Meka add karanna
        public decimal Score { get; set; }
    }
}