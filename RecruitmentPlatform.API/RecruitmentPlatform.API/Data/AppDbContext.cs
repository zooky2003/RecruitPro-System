using Microsoft.EntityFrameworkCore;
using RecruitmentPlatform.API.Models;

namespace RecruitmentPlatform.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        
        public DbSet<User> Users { get; set; }
        public DbSet<Application> Applications { get; set; }
        public DbSet<Interview> Interviews { get; set; }
        public DbSet<JobPosting> JobPostings { get; set; }
        public DbSet<Application> Application { get; set; }

        public DbSet<Department> Departments { get; set; }

        public DbSet<Job> Jobs { get; set; }

        

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Default Admin Seeding
            modelBuilder.Entity<User>().HasData(
                new User
                {
                    Id = 23730,
                    FullName = "dhananjaya jayarathna",
                    Email = "jayarathnaeadb@gmail.com",
                    Password = "123456",
                    Role = "Admin",
                    Birthday = new DateTime(2003, 11, 5)
                }
            );
        }
    }
}