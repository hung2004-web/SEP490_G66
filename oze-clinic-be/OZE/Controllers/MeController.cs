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
    [Authorize]
    [Route("api/[controller]")]
    public class MeController : ControllerBase
    {
        private readonly IUserService _userService;

        public MeController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<UserProfileResponse>>> GetProfileAsync()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse<UserProfileResponse>.FailureResult("User not identified"));
            }

            var profile = await _userService.GetUserProfileAsync(userId);
            if (profile == null)
            {
                return NotFound(ApiResponse<UserProfileResponse>.FailureResult("User profile not found"));
            }

            return Ok(ApiResponse<UserProfileResponse>.SuccessResult(profile));
        }

        [HttpPut]
        [Authorize(Roles = RoleConstants.PatientRole)]
        [ApiResponseValidationFilter]
        public async Task<ActionResult<ApiResponse<UpdateProfileResponse>>> UpdateProfileAsync([FromBody] UpdateProfileRequest request)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse<UpdateProfileResponse>.FailureResult("User not identified"));
            }

            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var result = await _userService.UpdateProfileAsync(userId, request, baseUrl);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        [HttpPost("verify-phone-otp")]
        [Authorize(Roles = RoleConstants.PatientRole)]
        [ApiResponseValidationFilter]
        public async Task<ActionResult<ApiResponse<UserProfileResponse>>> VerifyPhoneOtpAsync([FromBody] VerifyOtpRequest request)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse<UserProfileResponse>.FailureResult("User not identified"));
            }

            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var result = await _userService.VerifyPhoneOtpAsync(userId, request, baseUrl);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        [HttpPost("resend-phone-otp")]
        [Authorize(Roles = RoleConstants.PatientRole)]
        [ApiResponseValidationFilter]
        public async Task<ActionResult<ApiResponse<RegisterPendingResponse>>> ResendPhoneOtpAsync([FromBody] ResendOtpRequest request)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse<RegisterPendingResponse>.FailureResult("User not identified"));
            }

            var result = await _userService.ResendPhoneOtpAsync(userId, request);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        private string? GetUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        }
    }
}
