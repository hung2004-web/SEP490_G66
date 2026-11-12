using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Controllers
{
    [Authorize]
    [Route("api/leave-requests")]
    public class LeaveRequestsController : BaseApiController
    {
        private const string ShiftStaff =
            $"{RoleConstants.DoctorRole},{RoleConstants.ReceptionistRole},{RoleConstants.DentalImagingTechnicianRole}";

        private readonly ILeaveRequestService _leaveRequestService;

        public LeaveRequestsController(ILeaveRequestService leaveRequestService)
        {
            _leaveRequestService = leaveRequestService;
        }

        /// <summary>
        /// Ask for leave on a day (Slot empty) or half a day (Morning / Afternoon). There must be a shift in that time.
        /// </summary>
        [HttpPost]
        [Authorize(Roles = ShiftStaff)]
        public async Task<ActionResult<ApiResponse<LeaveRequestResponse>>> CreateAsync(
            [FromBody] CreateLeaveRequestRequest request,
            CancellationToken cancellationToken)
        {
            var leave = await _leaveRequestService.CreateAsync(CurrentUserId!, request, cancellationToken);
            return Ok(ApiResponse<LeaveRequestResponse>.SuccessResult(leave, ErrorConstants.LeaveRequestMessage.Created));
        }

        [HttpGet("my")]
        [Authorize(Roles = ShiftStaff)]
        public async Task<ActionResult<ApiResponse<PagedResult<LeaveRequestResponse>>>> GetMineAsync(
            [FromQuery] LeaveRequestQuery query,
            CancellationToken cancellationToken)
        {
            var page = await _leaveRequestService.GetMineAsync(CurrentUserId!, query, cancellationToken);
            return Ok(ApiResponse<PagedResult<LeaveRequestResponse>>.SuccessResult(page));
        }

        /// <summary>
        /// Withdraw your own request while it waits for a decision.
        /// </summary>
        [HttpPost("{id:long}/cancel")]
        [Authorize(Roles = ShiftStaff)]
        public async Task<ActionResult<ApiResponse<LeaveRequestResponse>>> CancelAsync(long id, CancellationToken cancellationToken)
        {
            var leave = await _leaveRequestService.CancelAsync(CurrentUserId!, id, cancellationToken);
            return Ok(ApiResponse<LeaveRequestResponse>.SuccessResult(leave, ErrorConstants.LeaveRequestMessage.Cancelled));
        }

        [HttpGet]
        [Authorize(Roles = RoleConstants.ClinicManagerRole)]
        public async Task<ActionResult<ApiResponse<PagedResult<LeaveRequestResponse>>>> GetPagedAsync(
            [FromQuery] LeaveRequestQuery query,
            CancellationToken cancellationToken)
        {
            var page = await _leaveRequestService.GetPagedAsync(query, cancellationToken);
            return Ok(ApiResponse<PagedResult<LeaveRequestResponse>>.SuccessResult(page));
        }

        /// <summary>
        /// The request with its shifts and booked appointments, and who can take over while it is pending.
        /// </summary>
        [HttpGet("{id:long}")]
        [Authorize(Roles = RoleConstants.ClinicManagerRole)]
        public async Task<ActionResult<ApiResponse<LeaveRequestDetailResponse>>> GetDetailAsync(long id, CancellationToken cancellationToken)
        {
            var detail = await _leaveRequestService.GetDetailAsync(id, cancellationToken);
            return Ok(ApiResponse<LeaveRequestDetailResponse>.SuccessResult(detail));
        }

        /// <summary>
        /// Approve. With a substitute the shifts and their booked appointments move to the substitute;
        /// without one the shifts are marked absent, which is only allowed when nothing is booked in them.
        /// </summary>
        [HttpPost("{id:long}/approve")]
        [Authorize(Roles = RoleConstants.ClinicManagerRole)]
        public async Task<ActionResult<ApiResponse<LeaveRequestResponse>>> ApproveAsync(
            long id,
            [FromBody] ApproveLeaveRequestRequest? request,
            CancellationToken cancellationToken)
        {
            var leave = await _leaveRequestService.ApproveAsync(CurrentUserId!, id, request ?? new ApproveLeaveRequestRequest(), cancellationToken);
            return Ok(ApiResponse<LeaveRequestResponse>.SuccessResult(leave, ErrorConstants.LeaveRequestMessage.Approved));
        }

        [HttpPost("{id:long}/reject")]
        [Authorize(Roles = RoleConstants.ClinicManagerRole)]
        public async Task<ActionResult<ApiResponse<LeaveRequestResponse>>> RejectAsync(
            long id,
            [FromBody] RejectLeaveRequestRequest request,
            CancellationToken cancellationToken)
        {
            var leave = await _leaveRequestService.RejectAsync(CurrentUserId!, id, request, cancellationToken);
            return Ok(ApiResponse<LeaveRequestResponse>.SuccessResult(leave, ErrorConstants.LeaveRequestMessage.Rejected));
        }
    }
}
