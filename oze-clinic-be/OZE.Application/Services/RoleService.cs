using Microsoft.AspNetCore.Identity;
using OZE.Application.Interfaces;
using OZE.Application.Middlewares;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.Services
{
    public class RoleService : IRoleService
    {
        private readonly RoleManager<ApplicationRole> _roleManager;

        public RoleService(RoleManager<ApplicationRole> roleManager)
        {
            _roleManager = roleManager;
        }

        public async Task<RoleResponse> CreateRoleAsync(CreateRoleRequest request)
        {
            var name = request.Name.Trim();
            // Role names are compared without case, so "doctor" and "Doctor" are the same role.
            ConditionGuard.ThrowIf(await _roleManager.RoleExistsAsync(name), ErrorConstants.RoleMessage.RoleExist);

            var role = new ApplicationRole(name)
            {
                Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow
            };

            var result = await _roleManager.CreateAsync(role);
            ConditionGuard.Ensure(result.Succeeded,
                result.Errors.FirstOrDefault()?.Description ?? ErrorConstants.RoleMessage.CreateFailed);

            return ToResponse(role, 0);
        }

        private static RoleResponse ToResponse(ApplicationRole role, int userCount)
        {
            return new RoleResponse
            {
                Id = role.Id,
                Name = role.Name ?? string.Empty,
                Description = role.Description,
                IsActive = role.IsActive,
                UserCount = userCount,
                CreatedAt = role.CreatedAt,
                UpdatedAt = role.UpdatedAt
            };
        }
    }
}
