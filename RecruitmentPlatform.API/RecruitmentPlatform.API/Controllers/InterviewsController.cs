using Microsoft.AspNetCore.Mvc;
using RecruitmentPlatform.API.Models;
using RecruitmentPlatform.API.Repositories;

namespace RecruitmentPlatform.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class InterviewsController : ControllerBase
    {
        private readonly IInterviewRepository _interviewRepository;

        public InterviewsController(IInterviewRepository interviewRepository)
        {
            _interviewRepository = interviewRepository;
        }

        // POST: api/Interviews
        [HttpPost]
        public async Task<ActionResult<Interview>> ScheduleInterview(Interview interview)
        {
            var result = await _interviewRepository.ScheduleInterviewAsync(interview);
            return Ok(result);
        }

        // GET: api/Interviews/application/{appId}
        [HttpGet("application/{appId}")]
        public async Task<ActionResult<IEnumerable<Interview>>> GetInterviewsForApp(int appId)
        {
            var interviews = await _interviewRepository.GetInterviewsByApplicationIdAsync(appId);
            return Ok(interviews);
        }

        // PUT: api/Interviews/{id}/feedback
        [HttpPut("{id}/feedback")]
        public async Task<ActionResult<Interview>> UpdateFeedback(int id, [FromQuery] string feedback, [FromQuery] decimal score)
        {
            var updated = await _interviewRepository.UpdateInterviewFeedbackAsync(id, feedback, score);
            if (updated == null) return NotFound("Interview not found");
            return Ok(updated);
        }
    }
}