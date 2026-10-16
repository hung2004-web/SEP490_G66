using OZE.Common.Models;

namespace OZE.Application.Interfaces
{
    public interface IRoleService
    {
        Task<RoleResponse> CreateRoleAsync(CreateRoleRequest request);
    }
}
