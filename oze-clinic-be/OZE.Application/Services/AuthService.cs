using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;

namespace OZE.Application.Services
{
    public class AuthService : IAuthService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly IUserRefreshTokenRepository _refreshTokenRepository;
        private readonly IJwtTokenGenerator _jwtTokenGenerator;
        private readonly IEmailSender _emailSender;
        private readonly JwtSettings _jwtSettings;

        public AuthService(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            RoleManager<IdentityRole> roleManager,
            IUserRefreshTokenRepository refreshTokenRepository,
            IJwtTokenGenerator jwtTokenGenerator,
            IEmailSender emailSender,
            IOptions<JwtSettings> jwtOptions)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _roleManager = roleManager;
            _refreshTokenRepository = refreshTokenRepository;
            _jwtTokenGenerator = jwtTokenGenerator;
            _emailSender = emailSender;
            _jwtSettings = jwtOptions.Value;
        }

        public async Task<ApiResponse<AuthResult>> RegisterAsync(RegisterRequest request, string baseUrl)
        {
            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            if (existingUser != null)
            {
                return ApiResponse<AuthResult>.FailureResult(ErrorConstants.AuthMessage.UserExist);
            }

            var user = new ApplicationUser
            {
                Id = Guid.NewGuid().ToString(),
                FullName = request.FullName,
                Email = request.Email,
                UserName = request.Email,
                CreateDate = DateTime.UtcNow
            };

            var createResult = await _userManager.CreateAsync(user, request.Password);
            if (!createResult.Succeeded)
            {
                var errors = createResult.Errors.Select(e => e.Description).ToList();
                return ApiResponse<AuthResult>.FailureResult("User registration failed", errors);
            }

            // Assign default User role
            if (!await _roleManager.RoleExistsAsync(RoleConstants.UserRole))
            {
                await _roleManager.CreateAsync(new IdentityRole(RoleConstants.UserRole));
            }
            await _userManager.AddToRoleAsync(user, RoleConstants.UserRole);

            if (request.StartFreeTrial)
            {
                await _userManager.AddClaimAsync(user, new Claim("Trial", DateTime.UtcNow.ToString("O")));
            }

            // Send confirmation email
            try
            {
                var code = await _userManager.GenerateEmailConfirmationTokenAsync(user);
                var encodedCode = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(code));
                var callbackUrl = $"{baseUrl}/api/auth/confirm-email?userId={user.Id}&code={encodedCode}";

                await _emailSender.SendEmailVerificationAsync(user, callbackUrl);
            }
            catch
            {
                // Non-blocking email failure
            }

            return ApiResponse<AuthResult>.SuccessResult(new AuthResult(), "User registered successfully. Please check your email to confirm your account.");
        }

        public async Task<ApiResponse<AuthResult>> LoginAsync(LoginRequest request)
        {
            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
            {
                return ApiResponse<AuthResult>.FailureResult(ErrorConstants.AuthMessage.InvalidLogin);
            }

            if (!await _userManager.CheckPasswordAsync(user, request.Password))
            {
                return ApiResponse<AuthResult>.FailureResult(ErrorConstants.AuthMessage.InvalidLogin);
            }

            var token = await _jwtTokenGenerator.GenerateTokenAsync(user);
            var refreshToken = _jwtTokenGenerator.GenerateRefreshToken();
            var expiryDate = DateTime.UtcNow.AddDays(7);

            var tokenEntry = new UserRefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                AccessToken = token,
                RefreshToken = refreshToken,
                CreationDate = DateTime.UtcNow,
                ExpiryDate = expiryDate
            };

            await _refreshTokenRepository.AddAsync(tokenEntry);
            await _refreshTokenRepository.SaveChangesAsync();

            var result = new AuthResult
            {
                Token = token,
                RefreshToken = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiresInMinutes > 0 ? _jwtSettings.ExpiresInMinutes : 60)
            };

            return ApiResponse<AuthResult>.SuccessResult(result, "Login successful");
        }

        public async Task<ApiResponse<AuthResult>> RefreshTokenAsync(RefreshTokenRequest request)
        {
            var activeToken = await _refreshTokenRepository.GetActiveTokenAsync(request.RefreshToken);
            if (activeToken == null)
            {
                return ApiResponse<AuthResult>.FailureResult(ErrorConstants.AuthMessage.InvalidRefreshToken);
            }

            var user = await _userManager.FindByIdAsync(activeToken.UserId);
            if (user == null)
            {
                return ApiResponse<AuthResult>.FailureResult(ErrorConstants.AuthMessage.UserNotFound);
            }

            // Revoke old refresh token
            activeToken.RevokeAt = DateTime.UtcNow;
            await _refreshTokenRepository.UpdateAsync(activeToken);

            // Generate new token pair
            var newAccessToken = await _jwtTokenGenerator.GenerateTokenAsync(user);
            var newRefreshToken = _jwtTokenGenerator.GenerateRefreshToken();

            var newTokenEntry = new UserRefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                RefreshToken = newRefreshToken,
                AccessToken = newAccessToken,
                CreationDate = DateTime.UtcNow,
                ExpiryDate = DateTime.UtcNow.AddDays(7)
            };

            await _refreshTokenRepository.AddAsync(newTokenEntry);
            await _refreshTokenRepository.SaveChangesAsync();

            var result = new AuthResult
            {
                Token = newAccessToken,
                RefreshToken = newRefreshToken,
                ExpiresAt = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiresInMinutes > 0 ? _jwtSettings.ExpiresInMinutes : 60)
            };

            return ApiResponse<AuthResult>.SuccessResult(result, "Token refreshed successfully");
        }

        public async Task<ApiResponse> LogoutAsync(string userId)
        {
            await _refreshTokenRepository.RevokeUserTokensAsync(userId);
            await _refreshTokenRepository.SaveChangesAsync();
            await _signInManager.SignOutAsync();

            return ApiResponse.SuccessResult("Logged out successfully");
        }

        public async Task<ApiResponse> ConfirmEmailAsync(string userId, string code)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return ApiResponse.FailureResult(ErrorConstants.AuthMessage.UserNotFound);
            }

            try
            {
                var decodedCode = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(code));
                var result = await _userManager.ConfirmEmailAsync(user, decodedCode);

                if (!result.Succeeded)
                {
                    var errors = result.Errors.Select(e => e.Description).ToList();
                    return ApiResponse.FailureResult("Email confirmation failed", errors);
                }

                return ApiResponse.SuccessResult("Email confirmed successfully");
            }
            catch (Exception ex)
            {
                return ApiResponse.FailureResult("Invalid confirmation token: " + ex.Message);
            }
        }
    }
}
