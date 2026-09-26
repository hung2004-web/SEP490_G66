using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Application.Interfaces
{
    public interface IAuthService
    {
        Task<ApiResponse<AuthResult>> RegisterAsync(RegisterRequest request, string baseUrl);
        Task<ApiResponse<AuthResult>> LoginAsync(LoginRequest request);
        Task<ApiResponse<AuthResult>> RefreshTokenAsync(RefreshTokenRequest request);
        Task<ApiResponse> ConfirmEmailAsync(string userId, string code);
        Task<ApiResponse> LogoutAsync(string userId);
    }
}
