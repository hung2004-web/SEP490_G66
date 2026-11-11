using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Controllers
{
    /// <summary>
    /// Follow-up visits set on an examination: the list to remind, reminders and booking the follow-up appointment.
    /// Reminding patients is the receptionist's job; a doctor can see the list of their own patients and book a follow-up.
    /// Kept out of ExaminationsController, whose class-level Doctor role would also apply here and lock receptionists out.
    /// </summary>
    [ApiController]
    [Authorize]
    [Route("api/examinations")]
    public class FollowUpsController : BaseApiController
    {
        private const string ReceptionistOrDoctor = $"{RoleConstants.ReceptionistRole},{RoleConstants.DoctorRole}";

        private readonly IExaminationService _examinationService;

        public FollowUpsController(IExaminationService examinationService)
        {
            _examinationService = examinationService;
        }

        /// <summary>
        /// Patients with a follow-up date. A doctor only sees their own patients.
        /// </summary>
        [HttpGet("follow-ups")]
        [Authorize(Roles = ReceptionistOrDoctor)]
        public async Task<ActionResult<ApiResponse<PagedResult<FollowUpListItemResponse>>>> GetFollowUpsAsync(
            [FromQuery] FollowUpQueryParameters query, CancellationToken cancellationToken)
        {
            var doctorUserId = IsInRole(RoleConstants.ReceptionistRole) ? null : CurrentUserId;
            var result = await _examinationService.GetFollowUpsAsync(query, doctorUserId, cancellationToken);
            return Ok(ApiResponse<PagedResult<FollowUpListItemResponse>>.SuccessResult(result));
        }

        /// <summary>
        /// Books the follow-up appointment of an examination.
        /// </summary>
        [HttpPost("{id:long}/follow-up/schedule")]
        [Authorize(Roles = ReceptionistOrDoctor)]
        public async Task<ActionResult<ApiResponse<AppointmentResponse>>> ScheduleFollowUpAsync(
            long id, [FromBody] ScheduleFollowUpRequest request, CancellationToken cancellationToken)
        {
            var result = await _examinationService.ScheduleFollowUpAppointmentAsync(CurrentUserId ?? string.Empty, id, request, cancellationToken);
            return Ok(ApiResponse<AppointmentResponse>.SuccessResult(result, "Follow-up appointment scheduled successfully"));
        }

        /// <summary>
        /// The receptionist reminds one patient of the follow-up (SMS, email and in-app notification).
        /// </summary>
        [HttpPost("{id:long}/remind-follow-up")]
        [Authorize(Roles = RoleConstants.ReceptionistRole)]
        public async Task<ActionResult<ApiResponse<FollowUpListItemResponse>>> RemindFollowUpAsync(
            long id, [FromQuery] bool force = false, CancellationToken cancellationToken = default)
        {
            var result = await _examinationService.RemindFollowUpAsync(CurrentUserId ?? string.Empty, id, force, cancellationToken);
            return Ok(ApiResponse<FollowUpListItemResponse>.SuccessResult(result, "Follow-up reminder sent successfully"));
        }

        /// <summary>
        /// The receptionist reminds every patient whose follow-up is due (tomorrow by default).
        /// The background job sends the same reminders every morning.
        /// </summary>
        [HttpPost("follow-ups/remind-due")]
        [Authorize(Roles = RoleConstants.ReceptionistRole)]
        public async Task<ActionResult<ApiResponse<BatchRemindFollowUpResponse>>> RemindDueFollowUpsAsync(
            [FromQuery] DateOnly? targetDate, CancellationToken cancellationToken)
        {
            var result = await _examinationService.RemindDueFollowUpsAsync(targetDate, CurrentUserId, cancellationToken);
            return Ok(ApiResponse<BatchRemindFollowUpResponse>.SuccessResult(result, $"Follow-up reminders sent successfully to {result.RemindedCount} patients."));
        }
    }
}
