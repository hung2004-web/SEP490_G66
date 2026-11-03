using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Controllers
{
    /// <summary>
    /// What the manager does with the clocking of a doctor's shift.
    /// </summary>
    [ApiController]
    [Authorize(Roles = RoleConstants.ClinicManagerRole)]
    [Route("api/work-shifts")]
    public class WorkShiftAttendanceController : ControllerBase
    {
        private readonly IDoctorScheduleService _doctorScheduleService;

        public WorkShiftAttendanceController(IDoctorScheduleService doctorScheduleService)
        {
            _doctorScheduleService = doctorScheduleService;
        }

        /// <summary>
        /// Reopens a shift the doctor ended by mistake and takes back the patients that end marked NO_SHOW.
        /// </summary>
        [HttpPost("{id:long}/reopen")]
        public async Task<ActionResult<ApiResponse<ReopenShiftResponse>>> ReopenShiftAsync(long id)
        {
            var result = await _doctorScheduleService.ReopenShiftAsync(id);
            return Ok(ApiResponse<ReopenShiftResponse>.SuccessResult(result,
                $"Shift reopened, {result.RestoredAppointmentIds.Count} patient(s) restored"));
        }
    }
}
