using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
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

        // POST api/appointments/reception-booking (F-APT-09): booked by the receptionist, confirmed at once
        [HttpPost("reception-booking")]
        [Authorize(Roles = RoleConstants.ReceptionistRole)]
        public async Task<ActionResult<ApiResponse<AppointmentResponse>>> BookByReceptionistAsync([FromBody] ReceptionBookingRequest request)
        {
            var appointment = await _appointmentService.BookByReceptionistAsync(request, CurrentUserId ?? string.Empty);
            return Ok(ApiResponse<AppointmentResponse>.SuccessResult(appointment, "Appointment has been booked and confirmed."));
        }

        // POST api/appointments
        [HttpPost]
        [Authorize(Roles = RoleConstants.PatientRole)]
        public async Task<ActionResult<ApiResponse<AppointmentResponse>>> BookAsPatientAsync([FromBody] BookingRequest request)
        {
            // The empty fallback matches no patient, so a missing user id never books for someone else
            var appointment = await _appointmentService.BookAsPatientAsync(request, CurrentUserId ?? string.Empty);
            return Ok(ApiResponse<AppointmentResponse>.SuccessResult(appointment,
                "Appointment request received. The receptionist will call to confirm."));
        }

        /// <summary>
        /// Registers a patient who comes without a booking: the patient is checked in at once, sent to the room of the
        /// doctor's shift and put in the queue. A phone that already has a record uses that record.
        /// </summary>
        [HttpPost("walk-in")]
        [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.ClinicManagerRole}")]
        public async Task<ActionResult<ApiResponse<AppointmentResponse>>> CreateWalkInAsync(
            [FromBody] WalkInRequest request,
            CancellationToken cancellationToken)
        {
            var appointment = await _appointmentService.CreateWalkInAsync(request, CurrentUserId, cancellationToken);
            return Ok(ApiResponse<AppointmentResponse>.SuccessResult(appointment, "Walk-in registered and added to the queue"));
        }

        /// <summary>
        /// Today's patients the front desk has to deal with because their doctor ended the shift: the ones waiting in
        /// the clinic (to be moved to another doctor) and the ones booked for a time still to come (to be rescheduled).
        /// </summary>
        [HttpGet("needs-attention")]
        [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.ClinicManagerRole}")]
        public async Task<ActionResult<ApiResponse<List<NeedsAttentionResponse>>>> GetNeedsAttentionAsync(CancellationToken cancellationToken)
        {
            var result = await _appointmentService.GetNeedsAttentionAsync(cancellationToken);
            return Ok(ApiResponse<List<NeedsAttentionResponse>>.SuccessResult(result));
        }

        /// <summary>
        /// PENDING appointments past their confirmation deadline (waited too long, or the visit is close), for the desk to call.
        /// Only a warning: nothing is cancelled.
        /// </summary>
        [HttpGet("pending-overdue")]
        [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.ClinicManagerRole}")]
        public async Task<ActionResult<ApiResponse<List<PendingOverdueResponse>>>> GetPendingOverdueAsync(CancellationToken cancellationToken)
        {
            var result = await _appointmentService.GetPendingOverdueAsync(cancellationToken);
            return Ok(ApiResponse<List<PendingOverdueResponse>>.SuccessResult(result));
        }

        /// <summary>
        /// A checked-in patient who left without being seen: marked NO_SHOW and taken out of the queue.
        /// </summary>
        [HttpPost("{id:long}/no-show")]
        [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.ClinicManagerRole}")]
        public async Task<ActionResult<ApiResponse<AppointmentResponse>>> MarkNoShowAsync(
            [FromRoute] long id,
            [FromBody] MarkNoShowRequest? request,
            CancellationToken cancellationToken)
        {
            var result = await _appointmentService.MarkNoShowAsync(id, request, cancellationToken);
            return Ok(ApiResponse<AppointmentResponse>.SuccessResult(result, "Patient marked as NO_SHOW"));
        }

        /// <summary>
        /// Moves a waiting patient to another doctor who has a shift today. The patient goes to the room of that shift.
        /// </summary>
        [HttpPost("{id:long}/reassign-doctor")]
        [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.ClinicManagerRole}")]
        public async Task<ActionResult<ApiResponse<AppointmentResponse>>> ReassignDoctorAsync(
            [FromRoute] long id,
            [FromBody] ReassignDoctorRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _appointmentService.ReassignDoctorAsync(id, request, cancellationToken);
            return Ok(ApiResponse<AppointmentResponse>.SuccessResult(result, "Patient moved to another doctor"));
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
        /// Today's waiting list: checked-in patients in the order they will be seen. A doctor sees only their own list.
        /// </summary>
        [HttpGet("waiting-list")]
        [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.DoctorRole},{RoleConstants.ClinicManagerRole}")]
        public async Task<ActionResult<ApiResponse<List<WaitingListItemResponse>>>> GetWaitingListAsync(
            [FromQuery] int? doctorId,
            CancellationToken cancellationToken)
        {
            // Staff may pick any doctor; a doctor is limited to their own account, the empty fallback matches no doctor
            var doctorUserId = IsInRole(RoleConstants.DoctorRole) ? CurrentUserId ?? string.Empty : null;
            var result = await _appointmentService.GetWaitingListAsync(doctorId, doctorUserId, cancellationToken);
            return Ok(ApiResponse<List<WaitingListItemResponse>>.SuccessResult(result));
        }

        /// <summary>
        /// Retrieves the signed-in patient's own appointments, filtered by date range and status.
        /// </summary>
        [HttpGet("my")]
        [Authorize(Roles = RoleConstants.PatientRole)]
        public async Task<ActionResult<ApiResponse<PagedResult<AppointmentResponse>>>> GetMyAppointmentsAsync(
            [FromQuery] AppointmentQueryParameters query,
            CancellationToken cancellationToken)
        {
            // The empty fallback matches no patient, so a missing user id never lists someone else's appointments
            var result = await _appointmentService.GetMyAppointmentsAsync(query, CurrentUserId ?? string.Empty, cancellationToken);
            return Ok(ApiResponse<PagedResult<AppointmentResponse>>.SuccessResult(result));
        }

        /// <summary>
        /// Retrieves the signed-in patient's own follow-up recommendations and history.
        /// </summary>
        [HttpGet("my-follow-ups")]
        [Authorize(Roles = RoleConstants.PatientRole)]
        public async Task<ActionResult<ApiResponse<List<FollowUpListItemResponse>>>> GetMyFollowUpsAsync(
            [FromServices] IExaminationService examinationService,
            CancellationToken cancellationToken)
        {
            var result = await examinationService.GetMyFollowUpsAsync(CurrentUserId ?? string.Empty, cancellationToken);
            return Ok(ApiResponse<List<FollowUpListItemResponse>>.SuccessResult(result));
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
            return Ok(ApiResponse<AppointmentResponse>.SuccessResult(result, "Appointment cancelled successfully"));
        }

        /// <summary>
        /// Moves an appointment to a new time and/or doctor. A patient can only move their own pending appointment.
        /// </summary>
        [HttpPost("{id:long}/reschedule")]
        [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.ClinicManagerRole},{RoleConstants.PatientRole}")]
        public async Task<ActionResult<ApiResponse<AppointmentResponse>>> RescheduleAppointmentAsync(
            [FromRoute] long id,
            [FromBody] RescheduleAppointmentRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _appointmentService.RescheduleAppointmentAsync(id, request, OwnerRestriction, cancellationToken);
            return Ok(ApiResponse<AppointmentResponse>.SuccessResult(result, "Appointment rescheduled successfully"));
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
            return Ok(ApiResponse<AppointmentResponse>.SuccessResult(result, "Appointment confirmed successfully"));
        }

        /// <summary>
        /// Checks in an appointment upon patient arrival at the clinic.
        /// </summary>
        [HttpPost("{id:long}/check-in")]
        [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.ClinicManagerRole}")]
        public async Task<ActionResult<ApiResponse<AppointmentResponse>>> CheckInAppointmentAsync(
            [FromRoute] long id,
            [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] CheckInRequest? request,
            CancellationToken cancellationToken)
        {
            var result = await _appointmentService.CheckInAppointmentAsync(id, request, cancellationToken);
            return Ok(ApiResponse<AppointmentResponse>.SuccessResult(result, "Patient checked in successfully"));
        }

        /// <summary>
        /// Changes the waiting-list priority of a patient who is checked in and still waiting.
        /// </summary>
        [HttpPost("{id:long}/priority")]
        [Authorize(Roles = $"{RoleConstants.ReceptionistRole},{RoleConstants.ClinicManagerRole}")]
        public async Task<ActionResult<ApiResponse<AppointmentResponse>>> SetPriorityAsync(
            [FromRoute] long id,
            [FromBody] SetPriorityRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _appointmentService.SetPriorityAsync(id, request, cancellationToken);
            return Ok(ApiResponse<AppointmentResponse>.SuccessResult(result, "Priority updated successfully"));
        }

        /// <summary>
        /// Starts the visit: creates the examination and moves a checked-in appointment to in service.
        /// </summary>
        [HttpPost("{id:long}/start-examination")]
        [Authorize(Roles = RoleConstants.DoctorRole)]
        public async Task<ActionResult<ApiResponse<StartExaminationResponse>>> StartExaminationAsync(
            [FromRoute] long id,
            CancellationToken cancellationToken)
        {
            // The empty fallback matches no doctor, so a missing user id never starts someone else's visit
            var result = await _appointmentService.StartExaminationAsync(id, CurrentUserId ?? string.Empty, cancellationToken);
            return Ok(ApiResponse<StartExaminationResponse>.SuccessResult(result, "Examination started successfully"));
        }

        /// <summary>
        /// Completes the visit: locks the examination and marks the appointment completed.
        /// </summary>
        [HttpPost("{id:long}/complete-examination")]
        [Authorize(Roles = RoleConstants.DoctorRole)]
        public async Task<ActionResult<ApiResponse<AppointmentResponse>>> CompleteExaminationAsync(
            [FromRoute] long id,
            CancellationToken cancellationToken)
        {
            var result = await _appointmentService.CompleteExaminationAsync(id, CurrentUserId ?? string.Empty, cancellationToken);
            var message = result.PaymentWarnings.Count > 0
                ? ErrorConstants.PaymentWarningMessage.ExaminationCompletedWithWarnings
                : ErrorConstants.PaymentWarningMessage.ExaminationCompleted;
            return Ok(ApiResponse<AppointmentResponse>.SuccessResult(result, message));
        }

        /// <summary>
        /// Schedules a follow-up appointment for a finished or in-service visit.
        /// </summary>
        [HttpPost("{id:long}/follow-up")]
        [Authorize(Roles = $"{RoleConstants.DoctorRole},{RoleConstants.ReceptionistRole}")]
        public async Task<ActionResult<ApiResponse<AppointmentResponse>>> ScheduleFollowUpAsync(
            [FromRoute] long id,
            [FromBody] ScheduleFollowUpRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _appointmentService.ScheduleFollowUpAsync(id, request, CurrentUserId ?? string.Empty, cancellationToken);
            return Ok(ApiResponse<AppointmentResponse>.SuccessResult(result, "Follow-up appointment scheduled successfully"));
        }

        /// <summary>
        /// Retrieves the follow-up reminder list for receptionist and doctors.
        /// </summary>
        [HttpGet("follow-ups")]
        [Authorize(Roles = $"{RoleConstants.DoctorRole},{RoleConstants.ReceptionistRole}")]
        public async Task<ActionResult<ApiResponse<PagedResult<FollowUpListItemResponse>>>> GetFollowUpsAsync(
            [FromQuery] FollowUpQueryParameters query,
            [FromServices] IExaminationService examinationService,
            CancellationToken cancellationToken)
        {
            var doctorUserId = IsInRole(RoleConstants.ReceptionistRole) ? null : CurrentUserId;
            var result = await examinationService.GetFollowUpsAsync(query, doctorUserId, cancellationToken);
            return Ok(ApiResponse<PagedResult<FollowUpListItemResponse>>.SuccessResult(result));
        }
    }
}
