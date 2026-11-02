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
    [Authorize(Roles = RoleConstants.DoctorRole)]
    [Route("api/doctor-schedules")]
    public class DoctorSchedulesController : ControllerBase
    {
        private readonly IDoctorScheduleService _doctorScheduleService;

        public DoctorSchedulesController(IDoctorScheduleService doctorScheduleService)
        {
            _doctorScheduleService = doctorScheduleService;
        }

      
        [HttpGet]
        public async Task<ActionResult<ApiResponse<List<DoctorShiftResponse>>>> GetMyScheduleAsync([FromQuery] DoctorScheduleQueryRequest query)
        {
            var shifts = await _doctorScheduleService.GetMyScheduleAsync(GetUserId(), query);
            return Ok(ApiResponse<List<DoctorShiftResponse>>.SuccessResult(shifts));
        }

       
        [HttpGet("{shiftId:long}")]
        public async Task<ActionResult<ApiResponse<DoctorShiftResponse>>> GetMyShiftDetailAsync(long shiftId)
        {
            var shift = await _doctorScheduleService.GetMyShiftDetailAsync(GetUserId(), shiftId);
            return Ok(ApiResponse<DoctorShiftResponse>.SuccessResult(shift));
        }
      
        /// <summary>Clock in: starts a shift of today.</summary>
        [HttpPost("{shiftId:long}/start")]
        public async Task<ActionResult<ApiResponse<DoctorShiftResponse>>> StartShiftAsync(long shiftId)
        {
            var shift = await _doctorScheduleService.StartShiftAsync(GetUserId(), shiftId);
            return Ok(ApiResponse<DoctorShiftResponse>.SuccessResult(shift, "Đã bắt đầu ca làm việc"));
        }

        /// <summary>
        /// Clock out: ends a shift of today. Patients of the shift who were not examined are marked NO_SHOW.
        /// </summary>
        [HttpPost("{shiftId:long}/end")]
        public async Task<ActionResult<ApiResponse<EndShiftResponse>>> EndShiftAsync(long shiftId)
        {
            var result = await _doctorScheduleService.EndShiftAsync(GetUserId(), shiftId);
            return Ok(ApiResponse<EndShiftResponse>.SuccessResult(result,
                $"Đã kết thúc ca, {result.NoShowAppointmentIds.Count} bệnh nhân chưa khám bị đánh vắng mặt"));
        }

        private string GetUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;
        }
    }
}
