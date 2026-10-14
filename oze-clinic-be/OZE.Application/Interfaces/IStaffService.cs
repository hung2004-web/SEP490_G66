using OZE.Common.Models;

namespace OZE.Application.Interfaces
{
    public interface IStaffService
    {
        Task<List<StaffResponse>> GetStaffListAsync(StaffQueryRequest query);
        Task<StaffResponse> GetStaffAsync(string userId);
        Task<StaffResponse> CreateStaffAsync(CreateStaffRequest request);
        Task<StaffResponse> UpdateStaffAsync(string userId, UpdateStaffRequest request, string managerId);
        Task<StaffResponse> DeactivateStaffAsync(string userId, string managerId);
        Task<StaffResponse> ActivateStaffAsync(string userId);
    }
}
