using RecruitmentPlatform.API.Models;

namespace RecruitmentPlatform.API.Repositories
{
    public interface IInterviewRepository
    {
        Task<Interview> ScheduleInterviewAsync(Interview interview);
        Task<IEnumerable<Interview>> GetInterviewsByApplicationIdAsync(int appId);
        Task<Interview?> UpdateInterviewFeedbackAsync(int interviewId, string feedback, decimal score);
    }
}