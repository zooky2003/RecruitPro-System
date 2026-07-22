using Microsoft.AspNetCore.Mvc;
using RecruitmentPlatform.API.Models;
using RecruitmentPlatform.API.Repositories;

namespace RecruitmentPlatform.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ApplicationsController : ControllerBase
    {
        private readonly IApplicationRepository _applicationRepository;

        public ApplicationsController(IApplicationRepository applicationRepository)
        {
            _applicationRepository = applicationRepository;
        }

        // POST: api/Applications
        [HttpPost]
        public async Task<ActionResult<Application>> SubmitApplication(Application application)
        {
            var result = await _applicationRepository.SubmitApplicationAsync(application);
            return Ok(result);
        }

        // GET: api/Applications/job/{jobId}
        [HttpGet("job/{jobId}")]
        public async Task<ActionResult<IEnumerable<Application>>> GetApplicationsForJob(int jobId)
        {
            var applications = await _applicationRepository.GetApplicationsByJobIdAsync(jobId);
            return Ok(applications);
        }
        
    }
}