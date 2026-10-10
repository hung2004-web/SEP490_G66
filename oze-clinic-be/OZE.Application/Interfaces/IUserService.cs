using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IUserService
    {
        Task<ApplicationUser?> GetUserByEmailAsync(string email);
        Task<ApplicationUser?> GetUserByIdAsync(string userId);
        Task<bool> IsEmailInUseAsync(string email);
        Task<bool> IsPhoneInUseAsync(string phoneNumber);
        Task<UserProfileResponse?> GetUserProfileAsync(string userId);
        string? GetFullName(string userId);
        Task<ApiResponse<UpdateProfileResponse>> UpdateProfileAsync(string userId, UpdateProfileRequest request, string baseUrl);
        Task<ApiResponse<UserProfileResponse>> VerifyPhoneOtpAsync(string userId, VerifyOtpRequest request, string baseUrl);
        Task<ApiResponse<RegisterPendingResponse>> ResendPhoneOtpAsync(string userId, ResendOtpRequest request);
    }
}
