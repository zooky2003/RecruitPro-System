using RecruitmentPlatform.API.Models;

namespace RecruitmentPlatform.API.Repositories
{
    public interface IJobRepository
    {
        Task<IEnumerable<JobPosting>> GetAllJobsAsync();
        Task<JobPosting?> GetJobByIdAsync(int id);
        Task<JobPosting> CreateJobAsync(JobPosting job);
    }
}