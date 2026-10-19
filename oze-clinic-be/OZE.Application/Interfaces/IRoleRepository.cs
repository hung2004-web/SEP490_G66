using OZE.Common.Models;

namespace OZE.Application.Interfaces
{
    public interface IRoleRepository
    {
        Task<List<RoleResponse>> GetAllAsync(RoleQueryRequest query);
        Task<RoleResponse?> GetByIdAsync(string id);
    }
}
