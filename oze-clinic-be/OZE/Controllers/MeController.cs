using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Models;
using OZE.Common.Models.Base;

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
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
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
    }
}
