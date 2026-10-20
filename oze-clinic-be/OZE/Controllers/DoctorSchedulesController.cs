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

        
        private string GetUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;
        }
    }
}
