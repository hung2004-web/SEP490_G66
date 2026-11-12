using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Controllers
{
    // Schedule views for staff who cannot use the manager's work-shift API
    [Authorize]
    [Route("api/schedules")]
    public class SchedulesController : BaseApiController
    {
        private const string AllStaff =
            $"{RoleConstants.DoctorRole},{RoleConstants.ReceptionistRole},{RoleConstants.DentalImagingTechnicianRole},{RoleConstants.ClinicManagerRole}";

        private readonly IScheduleViewService _scheduleViewService;
        private readonly IDoctorScheduleService _shiftClockService;

        public SchedulesController(IScheduleViewService scheduleViewService, IDoctorScheduleService shiftClockService)
        {
            _scheduleViewService = scheduleViewService;
            _shiftClockService = shiftClockService;
        }

        /// <summary>
        /// Doctors with a shift on the day (today by default): room, shift time, and whether they are working, done or on leave.
        /// </summary>
        [HttpGet("doctors-on-duty")]
        [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.DoctorRole},{RoleConstants.ClinicManagerRole}")]
        public async Task<ActionResult<ApiResponse<List<DoctorOnDutyResponse>>>> GetDoctorsOnDutyAsync(
            [FromQuery] DoctorsOnDutyQuery query,
            CancellationToken cancellationToken)
        {
            var doctors = await _scheduleViewService.GetDoctorsOnDutyAsync(query, cancellationToken);
            return Ok(ApiResponse<List<DoctorOnDutyResponse>>.SuccessResult(doctors, ErrorConstants.ScheduleMessage.DoctorsRetrieved));
        }

        /// <summary>
        /// The signed-in staff member's own shifts; this week and next week by default.
        /// </summary>
        [HttpGet("my")]
        [Authorize(Roles = AllStaff)]
        public async Task<ActionResult<ApiResponse<List<WorkShipResponse>>>> GetMyShiftsAsync(
            [FromQuery] MyShiftsQuery query,
            CancellationToken cancellationToken)
        {
            var shifts = await _scheduleViewService.GetMyShiftsAsync(CurrentUserId!, query, cancellationToken);
            return Ok(ApiResponse<List<WorkShipResponse>>.SuccessResult(shifts, ErrorConstants.ScheduleMessage.ShiftsRetrieved));
        }

        /// <summary>
        /// Clock in for any staff member (receptionist, imaging technician, doctor): starts one of their own shifts of today.
        /// The same rules as api/doctor-schedules/{id}/start (from 30 minutes before the shift until it ends, room not in use).
        /// </summary>
        [HttpPost("my/{shiftId:long}/start")]
        [Authorize(Roles = AllStaff)]
        public async Task<ActionResult<ApiResponse<DoctorShiftResponse>>> StartMyShiftAsync(long shiftId)
        {
            var shift = await _shiftClockService.StartShiftAsync(CurrentUserId!, shiftId);
            return Ok(ApiResponse<DoctorShiftResponse>.SuccessResult(shift, "Shift started"));
        }

        /// <summary>
        /// Clock out for any staff member. For a doctor it also handles the patients of the shift (as api/doctor-schedules/{id}/end).
        /// </summary>
        [HttpPost("my/{shiftId:long}/end")]
        [Authorize(Roles = AllStaff)]
        public async Task<ActionResult<ApiResponse<EndShiftResponse>>> EndMyShiftAsync(long shiftId)
        {
            var result = await _shiftClockService.EndShiftAsync(CurrentUserId!, shiftId);
            return Ok(ApiResponse<EndShiftResponse>.SuccessResult(result, "Shift ended"));
        }
    }
}
