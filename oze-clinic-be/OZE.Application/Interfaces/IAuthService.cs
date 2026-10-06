using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Application.Interfaces
{
    public interface IAuthService
    {
        Task<ApiResponse<RegisterPendingResponse>> RegisterAsync(RegisterRequest request, string baseUrl);
        Task<ApiResponse<RegisterPendingResponse>> ResendOtpAsync(ResendOtpRequest request);
        Task<ApiResponse> VerifyOtpAsync(VerifyOtpRequest request, string baseUrl);
        Task<ApiResponse<AuthResult>> LoginAsync(LoginRequest request);
        Task<ApiResponse<AuthResult>> RefreshTokenAsync(RefreshTokenRequest request);
        Task<ApiResponse> ConfirmEmailAsync(string userId, string code);
        Task<ApiResponse> LogoutAsync(string userId);
        Task<ApiResponse> ChangePasswordAsync(string userId, ChangePasswordRequest request);
    }
}
