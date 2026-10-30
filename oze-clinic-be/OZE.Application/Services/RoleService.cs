using Microsoft.AspNetCore.Identity;
using OZE.Application.Interfaces;
using OZE.Application.Middlewares;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.Services
{
    public class RoleService : IRoleService
    {
        private readonly RoleManager<ApplicationRole> _roleManager;
        private readonly IRoleRepository _roleRepository;

        public RoleService(RoleManager<ApplicationRole> roleManager, IRoleRepository roleRepository)
        {
            _roleManager = roleManager;
            _roleRepository = roleRepository;
        }

        public async Task<List<RoleResponse>> GetRolesAsync(RoleQueryRequest query)
        {
            return await _roleRepository.GetAllAsync(query);
        }

        public async Task<RoleResponse> GetRoleAsync(string id)
        {
            var role = await _roleRepository.GetByIdAsync(id);
            ConditionGuard.Ensure<NotFoundException>(role != null, ErrorConstants.RoleMessage.RoleNotFound);
            return role!;
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

        public async Task<RoleResponse> UpdateRoleAsync(string id, UpdateRoleRequest request)
        {
            var role = await _roleManager.FindByIdAsync(id);
            ConditionGuard.Ensure<NotFoundException>(role != null, ErrorConstants.RoleMessage.RoleNotFound);

            role!.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
            role.UpdatedAt = DateTimeOffset.UtcNow;

            var result = await _roleManager.UpdateAsync(role);
            ConditionGuard.Ensure(result.Succeeded,
                result.Errors.FirstOrDefault()?.Description ?? ErrorConstants.RoleMessage.UpdateFailed);

            // UserCount is not stored on the role, so it is read again after the update.
            return await GetRoleAsync(role.Id);
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
        private static RoleResponse TestToResponse(ApplicationRole role, int userCount)
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
