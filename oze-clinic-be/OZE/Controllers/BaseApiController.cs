using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using OZE.Common.Models.Base;

namespace OZE.Controllers
{
    /// <summary>
    /// Base API Controller providing common user context helpers and standardized ApiResponse handling.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public abstract class BaseApiController : ControllerBase
    {
        /// <summary>
        /// Gets the current authenticated user's ID from claims (ClaimTypes.NameIdentifier or "sub").
        /// </summary>
        protected string? CurrentUserId =>
            User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");

        /// <summary>
        /// Gets the current authenticated user's email from claims.
        /// </summary>
        protected string? CurrentUserEmail =>
            User.FindFirstValue(ClaimTypes.Email);

        /// <summary>
        /// Gets all roles assigned to the current authenticated user.
        /// </summary>
        protected IEnumerable<string> CurrentUserRoles =>
            User.FindAll(ClaimTypes.Role).Select(c => c.Value);

        /// <summary>
        /// Checks whether the current authenticated user belongs to a specific role.
        /// </summary>
        protected bool IsInRole(string role) =>
            User.IsInRole(role);

        /// <summary>
        /// Returns an appropriate ActionResult based on the ApiResponse result (200 OK, 404 NotFound, or 400 BadRequest).
        /// </summary>
        protected ActionResult<ApiResponse<T>> HandleResult<T>(ApiResponse<T> result)
        {
            if (result == null)
            {
                return NotFound(ApiResponse<T>.FailureResult("Resource not found"));
            }

            if (result.Success)
            {
                return Ok(result);
            }

            if (result.Message.Contains("not found", StringComparison.OrdinalIgnoreCase) ||
                result.Message.Contains("NotFound", StringComparison.OrdinalIgnoreCase) ||
                result.Message.Contains("không tìm thấy", StringComparison.OrdinalIgnoreCase))
            {
                return NotFound(result);
            }

            return BadRequest(result);
        }

        /// <summary>
        /// Returns an appropriate ActionResult for non-generic ApiResponse results.
        /// </summary>
        protected ActionResult<ApiResponse> HandleResult(ApiResponse result)
        {
            if (result == null)
            {
                return NotFound(ApiResponse.FailureResult("Resource not found"));
            }

            if (result.Success)
            {
                return Ok(result);
            }

            if (result.Message.Contains("not found", StringComparison.OrdinalIgnoreCase) ||
                result.Message.Contains("NotFound", StringComparison.OrdinalIgnoreCase) ||
                result.Message.Contains("không tìm thấy", StringComparison.OrdinalIgnoreCase))
            {
                return NotFound(result);
            }

            return BadRequest(result);
        }
    }
}
