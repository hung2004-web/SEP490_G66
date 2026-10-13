using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.ProjectBase.Controllers
{
    [ApiController]
    [Authorize(Roles = RoleConstants.ClinicManagerRole)]
    [Route("api/work-shifts")]
    public class WorkShiftController : ControllerBase
    {
        private readonly IWorkShipService _workShipService;

        public WorkShiftController(IWorkShipService workShipService)
        {
            _workShipService = workShipService;
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<WorkShipResponse>>> CreateWorkShiftAsync([FromBody] CreateWorkShiftRequest request)
        {
            var shift = await _workShipService.CreateWorkShipAsync(request);
            return Ok(ApiResponse<WorkShipResponse>.SuccessResult(shift, "Work shift created successfully"));
        }
    }
}
