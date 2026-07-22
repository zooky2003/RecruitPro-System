using Microsoft.EntityFrameworkCore;
using RecruitmentPlatform.API.Data;
using RecruitmentPlatform.API.Models;

namespace RecruitmentPlatform.API.Repositories
{
    public class InterviewRepository : IInterviewRepository
    {
        private readonly AppDbContext _context;

        public InterviewRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Interview> ScheduleInterviewAsync(Interview interview)
        {
            await _context.Interviews.AddAsync(interview);
            await _context.SaveChangesAsync();
            return interview;
        }

        public async Task<IEnumerable<Interview>> GetInterviewsByApplicationIdAsync(int appId)
        {
            return await _context.Interviews.Where(i => i.AppId == appId).ToListAsync();
        }

        public async Task<Interview?> UpdateInterviewFeedbackAsync(int interviewId, string feedback, decimal score)
        {
            var interview = await _context.Interviews.FindAsync(interviewId);
            if (interview == null) return null;

            interview.Feedback = feedback;
            interview.Score = score;

            await _context.SaveChangesAsync();
            return interview;
        }
    }
}