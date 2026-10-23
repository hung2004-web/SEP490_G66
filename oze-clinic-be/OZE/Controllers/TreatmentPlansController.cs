using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Controllers
{
    [ApiController]
    [Authorize(Roles = RoleConstants.DoctorRole)]
    [Route("api/[controller]")]
    public class TreatmentPlansController : ControllerBase
    {
        private readonly ITreatmentPlanService _treatmentPlanService;

        public TreatmentPlansController(ITreatmentPlanService treatmentPlanService)
        {
            _treatmentPlanService = treatmentPlanService;
        }

        /// <summary>
        /// Returns treatment plan progress: stages with status and overall progress percent (UC-52 / AC1).
        /// </summary>
        [HttpGet("{id:long}/progress")]
        public async Task<ActionResult<ApiResponse<TreatmentPlanProgressResponse>>> GetProgressAsync(
            [FromRoute] long id,
            CancellationToken cancellationToken)
        {
            var progress = await _treatmentPlanService.GetProgressAsync(id, cancellationToken);
            return Ok(ApiResponse<TreatmentPlanProgressResponse>.SuccessResult(progress));
        }

        /// <summary>
        /// Starts the next scheduled stage. The stage becomes InProgress; the plan becomes InProgress on the first start (UC-52 step 3–4).
        /// </summary>
        [HttpPost("{id:long}/stages/{stageId:long}/start")]
        public async Task<ActionResult<ApiResponse<TreatmentPlanProgressResponse>>> StartStageAsync(
            [FromRoute] long id,
            [FromRoute] long stageId,
            CancellationToken cancellationToken)
        {
            var progress = await _treatmentPlanService.StartStageAsync(id, stageId, cancellationToken);
            return Ok(ApiResponse<TreatmentPlanProgressResponse>.SuccessResult(progress, "Start treatment stage success!"));
        }
    }
}
