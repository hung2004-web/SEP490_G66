using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Controllers
{
    [ApiController]
    [AllowAnonymous]
    [Route("api/[controller]")]
    public class AppointmentsController : ControllerBase
    {
        private readonly IAppointmentService _appointmentService;

        public AppointmentsController(IAppointmentService appointmentService)
        {
            _appointmentService = appointmentService;
        }
        // GET api/appointments/bookable-services
        [HttpGet("bookable-services")]
        public async Task<ActionResult<ApiResponse<List<BookableCategoryResponse>>>> GetBookableServicesAsync()
        {
            var categories = await _appointmentService.GetBookableServicesAsync();
            return Ok(ApiResponse<List<BookableCategoryResponse>>.SuccessResult(categories));
        }

        [HttpGet("available-slots")]
        public async Task<ActionResult<ApiResponse<List<AvailableSlotResponse>>>> GetAvailableSlotsAsync([FromQuery] AvailableSlotRequest request)
        {
            var slots = await _appointmentService.GetAvailableSlotsAsync(request);
            return Ok(ApiResponse<List<AvailableSlotResponse>>.SuccessResult(slots));
        }

        // POST api/appointments/guest-booking
        [HttpPost("guest-booking")]
        public async Task<ActionResult<ApiResponse<AppointmentResponse>>> BookAsGuestAsync([FromBody] GuestBookingRequest request)
        {
            var appointment = await _appointmentService.BookAsGuestAsync(request);
            return Ok(ApiResponse<AppointmentResponse>.SuccessResult(appointment,
                "Appointment request sent. The reception desk will confirm it soon"));
        }
    }
}
