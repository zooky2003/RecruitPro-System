using System.ComponentModel.DataAnnotations;

namespace RecruitmentPlatform.API.Models
{
    public class Organization
    {
        [Key]
        public int OrgId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
    }
}
