using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IStaffRepository
    {
        // The profile is tracked, so its changes are saved together with the account by UserManager.UpdateAsync.
        Task<StaffProfile?> GetByUserIdAsync(string userId);
        Task<bool> IsLicenseNumberInUseAsync(string licenseNumber, int excludedStaffId);
    }
}
