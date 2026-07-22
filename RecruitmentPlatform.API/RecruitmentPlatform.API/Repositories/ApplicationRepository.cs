using Microsoft.EntityFrameworkCore;
using RecruitmentPlatform.API.Data;
using RecruitmentPlatform.API.Models;

namespace RecruitmentPlatform.API.Repositories
{
    public class ApplicationRepository : IApplicationRepository
    {
        private readonly AppDbContext _context;

        public ApplicationRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Application> SubmitApplicationAsync(Application application)
        {
            // AI Score ekata demo random number ekak demu (50-100 athara)
            // Passe kaleka meka aththa AI service ekakata connect karanna puluwan!
            application.AIScore = new Random().Next(50, 100);

            await _context.Applications.AddAsync(application);
            await _context.SaveChangesAsync();
            return application;
        }

        public async Task<IEnumerable<Application>> GetApplicationsByJobIdAsync(int jobId)
        {
            return await _context.Applications.Where(a => a.JobId == jobId).ToListAsync();
        }
    }
}