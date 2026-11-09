using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using System.Security.Claims;

namespace OZE.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class TreatmentPlansController : ControllerBase
    {
        private readonly ITreatmentPlanService _treatmentPlanService;

        public TreatmentPlansController(ITreatmentPlanService treatmentPlanService)
        {
            _treatmentPlanService = treatmentPlanService;
        }

        /// <summary>
        /// Creates a draft treatment plan for an open examination; stages are built from services, numbered in the order sent.
        /// </summary>
        [Authorize(Roles = RoleConstants.DoctorRole)]
        [HttpPost("~/api/examinations/{examinationId:long}/treatment-plans")]
        public async Task<ActionResult<ApiResponse<TreatmentPlanProgressResponse>>> CreateAsync(
            [FromRoute] long examinationId,
            [FromBody] CreateTreatmentPlanRequest request,
            CancellationToken cancellationToken)
        {
            var plan = await _treatmentPlanService.CreateAsync(examinationId, request, GetUserId(), cancellationToken);
            return Ok(ApiResponse<TreatmentPlanProgressResponse>.SuccessResult(plan, "Create treatment plan success!"));
        }

        /// <summary>
        /// Returns one treatment plan with its stages, costs and the next stage to perform.
        /// A doctor sees the plans of patients they examine; reception sees every plan.
        /// </summary>
        [Authorize(Roles = DoctorOrReception)]
        [HttpGet("{id:long}")]
        public async Task<ActionResult<ApiResponse<TreatmentPlanProgressResponse>>> GetDetailAsync(
            [FromRoute] long id,
            CancellationToken cancellationToken)
        {
            var plan = await _treatmentPlanService.GetDetailAsync(id, GetUserId(), CanViewAll(), cancellationToken);
            return Ok(ApiResponse<TreatmentPlanProgressResponse>.SuccessResult(plan));
        }

        /// <summary>
        /// Lists a patient's treatment plans, newest first. Only open plans unless includeClosed is true.
        /// </summary>
        [Authorize(Roles = DoctorOrReception)]
        [HttpGet("~/api/patients/{patientId:int}/treatment-plans")]
        public async Task<ActionResult<ApiResponse<List<TreatmentPlanSummaryResponse>>>> GetByPatientAsync(
            [FromRoute] int patientId,
            [FromQuery] bool includeClosed,
            CancellationToken cancellationToken)
        {
            var plans = await _treatmentPlanService.GetByPatientAsync(patientId, includeClosed, GetUserId(), CanViewAll(), cancellationToken);
            return Ok(ApiResponse<List<TreatmentPlanSummaryResponse>>.SuccessResult(plans));
        }

        /// <summary>
        /// Saves a draft or proposed plan as sent: stages with an id are kept, new ones are added, missing ones are removed,
        /// and all are renumbered in order. A proposed plan goes back to draft.
        /// </summary>
        [Authorize(Roles = RoleConstants.DoctorRole)]
        [HttpPut("{id:long}")]
        public async Task<ActionResult<ApiResponse<TreatmentPlanProgressResponse>>> UpdateAsync(
            [FromRoute] long id,
            [FromBody] UpdateTreatmentPlanRequest request,
            CancellationToken cancellationToken)
        {
            var plan = await _treatmentPlanService.UpdateAsync(id, request, GetUserId(), cancellationToken);
            return Ok(ApiResponse<TreatmentPlanProgressResponse>.SuccessResult(plan, "Update treatment plan success!"));
        }

        /// <summary>
        /// Deletes a draft plan with its stages. Plans the patient has seen are cancelled instead.
        /// </summary>
        [Authorize(Roles = RoleConstants.DoctorRole)]
        [HttpDelete("{id:long}")]
        public async Task<ActionResult<ApiResponse>> DeleteAsync(
            [FromRoute] long id,
            CancellationToken cancellationToken)
        {
            await _treatmentPlanService.DeleteAsync(id, GetUserId(), cancellationToken);
            return Ok(ApiResponse.SuccessResult("Delete treatment plan success!"));
        }

        /// <summary>
        /// Draft -> Proposed: the doctor shows the finished plan to the patient. Editing it later sends it back to draft.
        /// </summary>
        [Authorize(Roles = RoleConstants.DoctorRole)]
        [HttpPost("{id:long}/propose")]
        public async Task<ActionResult<ApiResponse<TreatmentPlanProgressResponse>>> ProposeAsync(
            [FromRoute] long id,
            CancellationToken cancellationToken)
        {
            var plan = await _treatmentPlanService.ProposeAsync(id, GetUserId(), cancellationToken);
            return Ok(ApiResponse<TreatmentPlanProgressResponse>.SuccessResult(plan, "Propose treatment plan success!"));
        }

        /// <summary>
        /// Proposed -> Approved: records that the patient agreed. Done by the doctor or by reception.
        /// </summary>
        [Authorize(Roles = DoctorOrReception)]
        [HttpPost("{id:long}/approve")]
        public async Task<ActionResult<ApiResponse<TreatmentPlanProgressResponse>>> ApproveAsync(
            [FromRoute] long id,
            CancellationToken cancellationToken)
        {
            var plan = await _treatmentPlanService.ApproveAsync(id, GetUserId(), CanViewAll(), cancellationToken);
            return Ok(ApiResponse<TreatmentPlanProgressResponse>.SuccessResult(plan, "Approve treatment plan success!"));
        }

        /// <summary>
        /// Cancels a proposed, approved or in-progress plan with a reason. Stages not done yet are cancelled.
        /// </summary>
        [Authorize(Roles = DoctorOrReception)]
        [HttpPost("{id:long}/cancel")]
        public async Task<ActionResult<ApiResponse<TreatmentPlanProgressResponse>>> CancelAsync(
            [FromRoute] long id,
            [FromBody] CancelTreatmentPlanRequest request,
            CancellationToken cancellationToken)
        {
            var plan = await _treatmentPlanService.CancelAsync(id, request, GetUserId(), CanViewAll(), cancellationToken);
            return Ok(ApiResponse<TreatmentPlanProgressResponse>.SuccessResult(plan, "Cancel treatment plan success!"));
        }

        /// <summary>
        /// Returns treatment plan progress: stages with status and overall progress percent (UC-52 / AC1).
        /// </summary>
        [Authorize(Roles = RoleConstants.DoctorRole)]
        [HttpGet("{id:long}/progress")]
        public async Task<ActionResult<ApiResponse<TreatmentPlanProgressResponse>>> GetProgressAsync(
            [FromRoute] long id,
            CancellationToken cancellationToken)
        {
            var progress = await _treatmentPlanService.GetProgressAsync(id, GetUserId(), cancellationToken);
            return Ok(ApiResponse<TreatmentPlanProgressResponse>.SuccessResult(progress));
        }

        /// <summary>
        /// Starts the next scheduled stage. The stage becomes InProgress; the plan becomes InProgress on the first start (UC-52 step 3–4).
        /// </summary>
        [Authorize(Roles = RoleConstants.DoctorRole)]
        [HttpPost("{id:long}/stages/{stageId:long}/start")]
        public async Task<ActionResult<ApiResponse<TreatmentPlanProgressResponse>>> StartStageAsync(
            [FromRoute] long id,
            [FromRoute] long stageId,
            CancellationToken cancellationToken)
        {
            var progress = await _treatmentPlanService.StartStageAsync(id, stageId, GetUserId(), cancellationToken);
            return Ok(ApiResponse<TreatmentPlanProgressResponse>.SuccessResult(progress, "Start treatment stage success!"));
        }

        /// <summary>
        /// Updates notes and actual cost of the stage in progress, and optionally schedules the next stage (UC-52 step 5).
        /// </summary>
        [Authorize(Roles = RoleConstants.DoctorRole)]
        [HttpPatch("{id:long}/stages/{stageId:long}")]
        public async Task<ActionResult<ApiResponse<TreatmentPlanProgressResponse>>> UpdateStageAsync(
            [FromRoute] long id,
            [FromRoute] long stageId,
            [FromBody] UpdateTreatmentStageRequest request,
            CancellationToken cancellationToken)
        {
            var progress = await _treatmentPlanService.UpdateStageAsync(id, stageId, request, GetUserId(), cancellationToken);
            return Ok(ApiResponse<TreatmentPlanProgressResponse>.SuccessResult(progress, "Update treatment stage success!"));
        }

        /// <summary>
        /// Completes the stage in progress. The plan becomes Completed when every stage is completed or cancelled (UC-52 step 6–7).
        /// </summary>
        [Authorize(Roles = RoleConstants.DoctorRole)]
        [HttpPost("{id:long}/stages/{stageId:long}/complete")]
        public async Task<ActionResult<ApiResponse<TreatmentPlanProgressResponse>>> CompleteStageAsync(
            [FromRoute] long id,
            [FromRoute] long stageId,
            [FromBody(EmptyBodyBehavior = Microsoft.AspNetCore.Mvc.ModelBinding.EmptyBodyBehavior.Allow)] CompleteTreatmentStageRequest? request,
            CancellationToken cancellationToken)
        {
            var progress = await _treatmentPlanService.CompleteStageAsync(id, stageId, request, GetUserId(), cancellationToken);
            return Ok(ApiResponse<TreatmentPlanProgressResponse>.SuccessResult(progress, "Complete treatment stage success!"));
        }

        private const string DoctorOrReception = RoleConstants.DoctorRole + "," + RoleConstants.ReceptionistRole;

        private bool CanViewAll() => User.IsInRole(RoleConstants.ReceptionistRole);

        private string GetUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;
        }
    }
}
