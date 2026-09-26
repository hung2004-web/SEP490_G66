using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.ProjectBase.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<AuthResult>>> RegisterAsync([FromBody] RegisterRequest registerRequest)
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var result = await _authService.RegisterAsync(registerRequest, baseUrl);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<AuthResult>>> LoginAsync([FromBody] LoginRequest loginRequest)
        {
            var result = await _authService.LoginAsync(loginRequest);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        [HttpPost("refresh-token")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<AuthResult>>> RefreshTokenAsync([FromBody] RefreshTokenRequest request)
        {
            var result = await _authService.RefreshTokenAsync(request);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<ActionResult<ApiResponse>> LogoutAsync()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse.FailureResult("User not identified"));
            }

            var result = await _authService.LogoutAsync(userId);
            return Ok(result);
        }

        [HttpGet("confirm-email")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse>> ConfirmEmailAsync([FromQuery] string userId, [FromQuery] string code)
        {
            var result = await _authService.ConfirmEmailAsync(userId, code);
            return result.Success ? Ok(result) : BadRequest(result);
        }
    }
}
