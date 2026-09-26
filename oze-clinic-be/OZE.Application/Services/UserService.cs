using Microsoft.AspNetCore.Identity;
using OZE.Application.Interfaces;
using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.Services
{
    public class UserService : IUserService
    {
        private readonly UserManager<ApplicationUser> _userManager;

        public UserService(UserManager<ApplicationUser> userManager)
        {
            _userManager = userManager;
        }

        public async Task<ApplicationUser?> GetUserByEmailAsync(string email)
        {
            return await _userManager.FindByEmailAsync(email);
        }

        public async Task<ApplicationUser?> GetUserByIdAsync(string userId)
        {
            return await _userManager.FindByIdAsync(userId);
        }

        public async Task<bool> IsEmailInUseAsync(string email)
        {
            var user = await _userManager.FindByEmailAsync(email);
            return user != null;
        }

        public async Task<UserProfileResponse?> GetUserProfileAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return null;
            }

            var roles = await _userManager.GetRolesAsync(user);

            return new UserProfileResponse
            {
                Id = user.Id,
                Email = user.Email ?? string.Empty,
                FullName = user.FullName,
                Roles = roles
            };
        }
    }
}
