using Microsoft.EntityFrameworkCore;
using RecruitmentPlatform.API.Data;
using RecruitmentPlatform.API.Models;

namespace RecruitmentPlatform.API.Repositories
{
    public class JobRepository : IJobRepository
    {
        private readonly AppDbContext _context;

        public JobRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<JobPosting>> GetAllJobsAsync()
        {
            return await _context.JobPostings.ToListAsync();
        }

        public async Task<JobPosting?> GetJobByIdAsync(int id)
        {
            return await _context.JobPostings.FindAsync(id);
        }

        public async Task<JobPosting> CreateJobAsync(JobPosting job)
        {
            await _context.JobPostings.AddAsync(job);
            await _context.SaveChangesAsync();
            return job;
        }
    }
}