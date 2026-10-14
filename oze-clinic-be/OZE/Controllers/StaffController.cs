using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.ProjectBase.Filters;

namespace OZE.ProjectBase.Controllers
{
    [ApiController]
    [Authorize(Roles = RoleConstants.ClinicManagerRole)]
    [Route("api/[controller]")]
    public class StaffController : ControllerBase
    {
        private readonly IStaffService _staffService;

        public StaffController(IStaffService staffService)
        {
            _staffService = staffService;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<List<StaffResponse>>>> GetStaffListAsync([FromQuery] StaffQueryRequest query)
        {
            var staff = await _staffService.GetStaffListAsync(query);
            return Ok(ApiResponse<List<StaffResponse>>.SuccessResult(staff));
        }

        [HttpGet("{userId}")]
        public async Task<ActionResult<ApiResponse<StaffResponse>>> GetStaffAsync(string userId)
        {
            var staff = await _staffService.GetStaffAsync(userId);
            return Ok(ApiResponse<StaffResponse>.SuccessResult(staff));
        }

        [HttpPost]
        [ApiResponseValidationFilter]
        public async Task<ActionResult<ApiResponse<StaffResponse>>> CreateStaffAsync([FromBody] CreateStaffRequest request)
        {
            var staff = await _staffService.CreateStaffAsync(request);
            return Ok(ApiResponse<StaffResponse>.SuccessResult(staff, ErrorConstants.StaffMessage.StaffCreated));
        }

        [HttpPut("{userId}")]
        [ApiResponseValidationFilter]
        public async Task<ActionResult<ApiResponse<StaffResponse>>> UpdateStaffAsync(string userId, [FromBody] UpdateStaffRequest request)
        {
            var managerId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (string.IsNullOrEmpty(managerId))
            {
                return Unauthorized(ApiResponse<StaffResponse>.FailureResult("User not identified"));
            }

            var staff = await _staffService.UpdateStaffAsync(userId, request, managerId);
            return Ok(ApiResponse<StaffResponse>.SuccessResult(staff, ErrorConstants.StaffMessage.StaffUpdated));
        }

        [HttpPut("{userId}/deactivate")]
        public async Task<ActionResult<ApiResponse<StaffResponse>>> DeactivateStaffAsync(string userId)
        {
            var managerId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (string.IsNullOrEmpty(managerId))
            {
                return Unauthorized(ApiResponse<StaffResponse>.FailureResult("User not identified"));
            }

            var staff = await _staffService.DeactivateStaffAsync(userId, managerId);
            return Ok(ApiResponse<StaffResponse>.SuccessResult(staff, ErrorConstants.StaffMessage.StaffDeactivated));
        }

        [HttpPut("{userId}/activate")]
        public async Task<ActionResult<ApiResponse<StaffResponse>>> ActivateStaffAsync(string userId)
        {
            var staff = await _staffService.ActivateStaffAsync(userId);
            return Ok(ApiResponse<StaffResponse>.SuccessResult(staff, ErrorConstants.StaffMessage.StaffActivated));
        }
    }
}
