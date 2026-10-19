using OZE.Common.Models;

namespace OZE.Application.Interfaces
{
    public interface IRoleService
    {
        Task<List<RoleResponse>> GetRolesAsync(RoleQueryRequest query);
        Task<RoleResponse> GetRoleAsync(string id);
        Task<RoleResponse> CreateRoleAsync(CreateRoleRequest request);
        Task<RoleResponse> UpdateRoleAsync(string id, UpdateRoleRequest request);
    }
}
