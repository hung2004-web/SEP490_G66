using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AppointmentsController : BaseApiController
    {
        private readonly IAppointmentService _appointmentService;

        public AppointmentsController(IAppointmentService appointmentService)
        {
            _appointmentService = appointmentService;
        }

        // Staff see every appointment (null). A patient is limited to their own; the empty fallback matches no one, so a missing user id never widens access
        private string? OwnerRestriction =>
            IsInRole(RoleConstants.ReceptionistRole) || IsInRole(RoleConstants.DoctorRole) || IsInRole(RoleConstants.ClinicManagerRole)
                ? null
                : CurrentUserId ?? string.Empty;

        // GET api/appointments/bookable-services
        [HttpGet("bookable-services")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<List<BookableServiceResponse>>>> GetBookableServicesAsync()
        {
            var services = await _appointmentService.GetBookableServicesAsync();
            return Ok(ApiResponse<List<BookableServiceResponse>>.SuccessResult(services));
        }

        [HttpGet("available-slots")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<List<AvailableSlotResponse>>>> GetAvailableSlotsAsync([FromQuery] AvailableSlotRequest request)
        {
            var slots = await _appointmentService.GetAvailableSlotsAsync(request);
            return Ok(ApiResponse<List<AvailableSlotResponse>>.SuccessResult(slots));
        }

        // POST api/appointments/guest-booking
        [HttpPost("guest-booking")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<AppointmentResponse>>> BookAsGuestAsync([FromBody] GuestBookingRequest request)
        {
            var appointment = await _appointmentService.BookAsGuestAsync(request);
            return Ok(ApiResponse<AppointmentResponse>.SuccessResult(appointment,
                "Appointment request received. The receptionist will call to confirm."));
        }

        /// <summary>
        /// Retrieves a paginated list of appointments with optional filtering by date, doctor, patient, status, and search keyword.
        /// </summary>
        [HttpGet]
        [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.DoctorRole},{RoleConstants.ClinicManagerRole}")]
        public async Task<ActionResult<ApiResponse<PagedResult<AppointmentResponse>>>> GetAppointmentsAsync(
            [FromQuery] AppointmentQueryParameters query,
            CancellationToken cancellationToken)
        {
            var result = await _appointmentService.GetAppointmentsAsync(query, cancellationToken);
            return Ok(ApiResponse<PagedResult<AppointmentResponse>>.SuccessResult(result));
        }

        /// <summary>
        /// Retrieves appointment details by appointment ID.
        /// </summary>
        [HttpGet("{id:long}")]
        [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.DoctorRole},{RoleConstants.ClinicManagerRole},{RoleConstants.PatientRole}")]
        public async Task<ActionResult<ApiResponse<AppointmentResponse>>> GetAppointmentByIdAsync(
            [FromRoute] long id,
            CancellationToken cancellationToken)
        {
            var result = await _appointmentService.GetAppointmentByIdAsync(id, OwnerRestriction, cancellationToken);
            return Ok(ApiResponse<AppointmentResponse>.SuccessResult(result));
        }

        /// <summary>
        /// Cancels an appointment with a specified reason.
        /// </summary>
        [HttpPost("{id:long}/cancel")]
        [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.DoctorRole},{RoleConstants.ClinicManagerRole},{RoleConstants.PatientRole}")]
        public async Task<ActionResult<ApiResponse<AppointmentResponse>>> CancelAppointmentAsync(
            [FromRoute] long id,
            [FromBody] CancelAppointmentRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _appointmentService.CancelAppointmentAsync(id, request, CurrentUserId, OwnerRestriction, cancellationToken);
            return Ok(ApiResponse<AppointmentResponse>.SuccessResult(result, "Hủy lịch hẹn thành công"));
        }

        /// <summary>
        /// Confirms an appointment that is waiting for the receptionist's confirmation.
        /// </summary>
        [HttpPost("{id:long}/confirm")]
        [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.ClinicManagerRole}")]
        public async Task<ActionResult<ApiResponse<AppointmentResponse>>> ConfirmAppointmentAsync(
            [FromRoute] long id,
            CancellationToken cancellationToken)
        {
            var result = await _appointmentService.ConfirmAppointmentAsync(id, cancellationToken);
            return Ok(ApiResponse<AppointmentResponse>.SuccessResult(result, "Xác nhận lịch hẹn thành công"));
        }

        /// <summary>
        /// Checks in an appointment upon patient arrival at the clinic.
        /// </summary>
        [HttpPost("{id:long}/check-in")]
        [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.ClinicManagerRole}")]
        public async Task<ActionResult<ApiResponse<AppointmentResponse>>> CheckInAppointmentAsync(
            [FromRoute] long id,
            CancellationToken cancellationToken)
        {
            var result = await _appointmentService.CheckInAppointmentAsync(id, cancellationToken);
            return Ok(ApiResponse<AppointmentResponse>.SuccessResult(result, "Tiếp đón bệnh nhân thành công"));
        }
    }
}
