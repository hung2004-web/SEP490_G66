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
    public class RolesController : ControllerBase
    {
        private readonly IRoleService _roleService;

        public RolesController(IRoleService roleService)
        {
            _roleService = roleService;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<List<RoleResponse>>>> GetRolesAsync([FromQuery] RoleQueryRequest query)
        {
            var roles = await _roleService.GetRolesAsync(query);
            return Ok(ApiResponse<List<RoleResponse>>.SuccessResult(roles));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<RoleResponse>>> GetRoleAsync(string id)
        {
            var role = await _roleService.GetRoleAsync(id);
            return Ok(ApiResponse<RoleResponse>.SuccessResult(role));
        }

        [HttpPost]
        [ApiResponseValidationFilter]
        public async Task<ActionResult<ApiResponse<RoleResponse>>> CreateRoleAsync([FromBody] CreateRoleRequest request)
        {
            var role = await _roleService.CreateRoleAsync(request);
            return Ok(ApiResponse<RoleResponse>.SuccessResult(role, ErrorConstants.RoleMessage.RoleCreated));
        }
    }
}
