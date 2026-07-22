using System.ComponentModel.DataAnnotations;

namespace RecruitmentPlatform.API.Models
{
    public class Department
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        public string HeadOfDepartment { get; set; } = string.Empty;

        public int EmployeeCount { get; set; } = 0;
    }
}