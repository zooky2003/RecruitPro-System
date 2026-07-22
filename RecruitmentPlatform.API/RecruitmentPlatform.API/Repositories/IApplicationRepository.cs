using RecruitmentPlatform.API.Models;

namespace RecruitmentPlatform.API.Repositories
{
    public interface IApplicationRepository
    {
        Task<Application> SubmitApplicationAsync(Application application);
        Task<IEnumerable<Application>> GetApplicationsByJobIdAsync(int jobId);
    }
}