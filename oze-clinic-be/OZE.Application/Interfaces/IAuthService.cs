using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Application.Interfaces
{
    public interface IAuthService
    {
        Task<ApiResponse<RegisterPendingResponse>> RegisterAsync(RegisterRequest request, string baseUrl);
        Task<ApiResponse<RegisterPendingResponse>> ResendOtpAsync(ResendOtpRequest request);
        Task<ApiResponse> VerifyOtpAsync(VerifyOtpRequest request, string baseUrl);
        Task<ApiResponse<RegisterPendingResponse>> ForgotPasswordAsync(ForgotPasswordRequest request); Task<ApiResponse<AuthResult>> LoginAsync(LoginRequest request);
        Task<ApiResponse<AuthResult>> RefreshTokenAsync(RefreshTokenRequest request);
        Task<ApiResponse> ConfirmEmailAsync(string userId, string code);
        /// <param name="userId">Authenticated user id; required to revoke every device when no refresh token is sent.</param>
        /// <param name="refreshToken">When set, only this refresh token is revoked (works without userId).</param>
        Task<ApiResponse> LogoutAsync(string? userId, string? refreshToken = null);
        Task<ApiResponse> ChangePasswordAsync(string userId, ChangePasswordRequest request);
        Task<ApiResponse> VerifyResetOtpAsync(VerifyResetOtpRequest request);
        Task<ApiResponse> ResetPasswordAsync(ResetPasswordRequest request);
    }
}
