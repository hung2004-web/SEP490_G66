using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IUserService
    {
        Task<ApplicationUser?> GetUserByEmailAsync(string email);
        Task<ApplicationUser?> GetUserByIdAsync(string userId);
        Task<bool> IsEmailInUseAsync(string email);
        Task<UserProfileResponse?> GetUserProfileAsync(string userId);
    }
}
