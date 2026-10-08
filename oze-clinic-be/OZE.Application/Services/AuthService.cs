using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OZE.Application.Helpers;
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
        private readonly ISmsSender _smsSender;
        private readonly IPendingRegistrationStore _pendingRegistrationStore;
        private readonly JwtSettings _jwtSettings;
        private readonly RegisterOtpSettings _otpSettings;
        private readonly ILogger<AuthService> _logger;

        public AuthService(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            RoleManager<IdentityRole> roleManager,
            IUserRefreshTokenRepository refreshTokenRepository,
            IJwtTokenGenerator jwtTokenGenerator,
            IEmailSender emailSender,
            ISmsSender smsSender,
            IPendingRegistrationStore pendingRegistrationStore,
            IOptions<JwtSettings> jwtOptions,
            IOptions<RegisterOtpSettings> otpOptions,
            ILogger<AuthService> logger)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _roleManager = roleManager;
            _refreshTokenRepository = refreshTokenRepository;
            _jwtTokenGenerator = jwtTokenGenerator;
            _emailSender = emailSender;
            _smsSender = smsSender;
            _pendingRegistrationStore = pendingRegistrationStore;
            _jwtSettings = jwtOptions.Value;
            _otpSettings = otpOptions.Value;
            _logger = logger;
        }

        public async Task<ApiResponse<RegisterPendingResponse>> RegisterAsync(RegisterRequest request, string baseUrl)
        {
            if (!PhoneNumberHelper.TryNormalize(request.PhoneNumber, out var phoneNumber))
            {
                return ApiResponse<RegisterPendingResponse>.FailureResult(ErrorConstants.AuthMessage.InvalidPhone);
            }

            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            if (existingUser != null)
            {
                return ApiResponse<RegisterPendingResponse>.FailureResult(ErrorConstants.AuthMessage.UserExist);
            }

            if (_userManager.Users.Any(u => u.PhoneNumber == phoneNumber))
            {
                return ApiResponse<RegisterPendingResponse>.FailureResult(ErrorConstants.AuthMessage.PhoneExist);
            }

            var sessionId = Guid.NewGuid().ToString("N");
            var otp = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
            var now = DateTime.UtcNow;
            var expiresAt = now.AddMinutes(_otpSettings.ExpiresInMinutes > 0 ? _otpSettings.ExpiresInMinutes : 5);
            var ttl = expiresAt - now;

            var pending = new PendingRegistration
            {
                SessionId = sessionId,
                FullName = request.FullName,
                Email = request.Email,
                PhoneNumber = phoneNumber,
                PasswordHash = _userManager.PasswordHasher.HashPassword(new ApplicationUser(), request.Password),
                OtpHash = HashOtp(sessionId, otp),
                ExpiresAt = expiresAt,
                LastSentAt = now,
                FailedAttempts = 0,
                StartFreeTrial = request.StartFreeTrial
            };

            _pendingRegistrationStore.Save(pending, ttl);

            try
            {
                await _smsSender.SendSmsAsync(
                    phoneNumber,
                    $"Ma OTP OZE cua ban la {otp}. Hieu luc {_otpSettings.ExpiresInMinutes} phut.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send registration OTP SMS to {Phone}", phoneNumber);
            }

            return ApiResponse<RegisterPendingResponse>.SuccessResult(
                ToPendingResponse(pending),
                "OTP has been sent to your phone number");
        }

        public async Task<ApiResponse<RegisterPendingResponse>> ResendOtpAsync(ResendOtpRequest request)
        {
            var pending = _pendingRegistrationStore.Get(request.SessionId);
            if (pending == null || pending.ExpiresAt <= DateTime.UtcNow)
            {
                return ApiResponse<RegisterPendingResponse>.FailureResult(ErrorConstants.AuthMessage.OtpExpired);
            }

            var cooldown = _otpSettings.ResendCooldownSeconds > 0 ? _otpSettings.ResendCooldownSeconds : 60;
            var resendAvailableAt = pending.LastSentAt.AddSeconds(cooldown);
            if (DateTime.UtcNow < resendAvailableAt)
            {
                return ApiResponse<RegisterPendingResponse>.FailureResult(ErrorConstants.AuthMessage.OtpResendTooSoon);
            }

            var otp = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
            pending.OtpHash = HashOtp(pending.SessionId, otp);
            pending.LastSentAt = DateTime.UtcNow;
            pending.FailedAttempts = 0;
            _pendingRegistrationStore.Save(pending, pending.ExpiresAt - DateTime.UtcNow);

            try
            {
                await _smsSender.SendSmsAsync(
                    pending.PhoneNumber,
                    $"Ma OTP OZE cua ban la {otp}. Hieu luc {_otpSettings.ExpiresInMinutes} phut.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to resend registration OTP SMS to {Phone}", pending.PhoneNumber);
            }

            return ApiResponse<RegisterPendingResponse>.SuccessResult(
                ToPendingResponse(pending),
                "OTP has been resent to your phone number");
        }

        public async Task<ApiResponse> VerifyOtpAsync(VerifyOtpRequest request, string baseUrl)
        {
            var pending = _pendingRegistrationStore.Get(request.SessionId);
            if (pending == null || pending.ExpiresAt <= DateTime.UtcNow)
            {
                return ApiResponse.FailureResult(ErrorConstants.AuthMessage.OtpExpired);
            }

            var maxAttempts = _otpSettings.MaxAttempts > 0 ? _otpSettings.MaxAttempts : 5;
            if (pending.FailedAttempts >= maxAttempts)
            {
                _pendingRegistrationStore.Remove(pending.SessionId);
                return ApiResponse.FailureResult(ErrorConstants.AuthMessage.InvalidOtp);
            }

            if (!FixedTimeEquals(pending.OtpHash, HashOtp(pending.SessionId, request.Otp.Trim())))
            {
                pending.FailedAttempts++;
                if (pending.FailedAttempts >= maxAttempts)
                {
                    _pendingRegistrationStore.Remove(pending.SessionId);
                }
                else
                {
                    _pendingRegistrationStore.Save(pending, pending.ExpiresAt - DateTime.UtcNow);
                }

                return ApiResponse.FailureResult(ErrorConstants.AuthMessage.InvalidOtp);
            }

            if (await _userManager.FindByEmailAsync(pending.Email) != null
                || _userManager.Users.Any(u => u.PhoneNumber == pending.PhoneNumber))
            {
                _pendingRegistrationStore.Remove(pending.SessionId);
                return ApiResponse.FailureResult(ErrorConstants.AuthMessage.UserExist);
            }

            var user = new ApplicationUser
            {
                Id = Guid.NewGuid().ToString(),
                Email = pending.Email,
                UserName = pending.Email,
                PhoneNumber = pending.PhoneNumber,
                PhoneNumberConfirmed = true,
                PasswordHash = pending.PasswordHash,
                CreatedAt = DateTimeOffset.UtcNow,
                Patient = new Patient
                {
                    PatientCode = GeneratePatientCode(),
                    FullName = pending.FullName,
                    PhoneNumber = pending.PhoneNumber,
                    Email = pending.Email,
                    CreatedAt = DateTimeOffset.UtcNow
                }
            };

            var createResult = await _userManager.CreateAsync(user);
            if (!createResult.Succeeded)
            {
                var errors = createResult.Errors.Select(e => e.Description).ToList();
                return ApiResponse.FailureResult("User registration failed", errors);
            }

            // Assign default Patient role
            if (!await _roleManager.RoleExistsAsync(RoleConstants.PatientRole))
            {
                await _roleManager.CreateAsync(new IdentityRole(RoleConstants.PatientRole));
            }
            await _userManager.AddToRoleAsync(user, RoleConstants.PatientRole);

            if (pending.StartFreeTrial)
            {
                await _userManager.AddClaimAsync(user, new Claim("Trial", DateTime.UtcNow.ToString("O")));
            }

            _pendingRegistrationStore.Remove(pending.SessionId);

            try
            {
                var code = await _userManager.GenerateEmailConfirmationTokenAsync(user);
                var encodedCode = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(code));
                var callbackUrl = $"{baseUrl}/api/auth/confirm-email?userId={user.Id}&code={encodedCode}";
                await _emailSender.SendEmailVerificationAsync(user, callbackUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send confirmation email to {Email} after OTP verification", user.Email);
            }

            return ApiResponse.SuccessResult("Account created successfully. Please log in.");
        }

        private RegisterPendingResponse ToPendingResponse(PendingRegistration pending)
        {
            var cooldown = _otpSettings.ResendCooldownSeconds > 0 ? _otpSettings.ResendCooldownSeconds : 60;
            return new RegisterPendingResponse
            {
                SessionId = pending.SessionId,
                MaskedPhoneNumber = PhoneNumberHelper.Mask(pending.PhoneNumber),
                ExpiresAt = pending.ExpiresAt,
                ResendAvailableAt = pending.LastSentAt.AddSeconds(cooldown)
            };
        }

        private static string HashOtp(string sessionId, string otp)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes($"{sessionId}:{otp}"));
            return Convert.ToHexString(bytes);
        }

        private static bool FixedTimeEquals(string left, string right)
        {
            var leftBytes = Encoding.UTF8.GetBytes(left);
            var rightBytes = Encoding.UTF8.GetBytes(right);
            return leftBytes.Length == rightBytes.Length
                && CryptographicOperations.FixedTimeEquals(leftBytes, rightBytes);
        }

        public async Task<ApiResponse<AuthResult>> LoginAsync(LoginRequest request)
        {
            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
                return ApiResponse<AuthResult>.FailureResult(ErrorConstants.AuthMessage.InvalidLogin);

         
            var signIn = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
            if (signIn.IsLockedOut)
                return ApiResponse<AuthResult>.FailureResult("Account is temporarily locked. Please try again later.");
            if (!signIn.Succeeded)
                return ApiResponse<AuthResult>.FailureResult(ErrorConstants.AuthMessage.InvalidLogin);

           

            var now = DateTime.UtcNow;
            var accessTokenMinutes = _jwtSettings.ExpiresInMinutes > 0 ? _jwtSettings.ExpiresInMinutes : 60;

            var token = await _jwtTokenGenerator.GenerateTokenAsync(user);
            var refreshToken = _jwtTokenGenerator.GenerateRefreshToken();

            await _refreshTokenRepository.AddAsync(new UserRefreshToken
            {
                UserId = user.Id,
                RefreshToken = refreshToken,
                //CreationDate = now,
                ExpiryDate = now.AddDays(7)
            });
            await _refreshTokenRepository.SaveChangesAsync();

            return ApiResponse<AuthResult>.SuccessResult(new AuthResult
            {
                Token = token,
                RefreshToken = refreshToken,
                ExpiresAt = now.AddMinutes(accessTokenMinutes)
            }, "Login successful");
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
            activeToken.RevokedAt = DateTimeOffset.UtcNow;
            await _refreshTokenRepository.UpdateAsync(activeToken);

            // Generate new token pair
            var newAccessToken = await _jwtTokenGenerator.GenerateTokenAsync(user);
            var newRefreshToken = _jwtTokenGenerator.GenerateRefreshToken();

            var newTokenEntry = new UserRefreshToken
            {
                UserId = user.Id,
                RefreshToken = newRefreshToken,
                ExpiryDate = DateTimeOffset.UtcNow.AddDays(7)
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

        public async Task<ApiResponse> ForgotPasswordAsync(ForgotPasswordRequest request, string baseUrl)
        {
            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
            {
                return ApiResponse.FailureResult(ErrorConstants.AuthMessage.EmailNotFound);
            }
            var temporaryPassword = GenerateTemporaryPassword();
            try { await _emailSender.SendTemporaryPasswordAsync(user, temporaryPassword); }
            catch { return ApiResponse.FailureResult(ErrorConstants.AuthMessage.EmailCantSent); }

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var result = await _userManager.ResetPasswordAsync(user, token, temporaryPassword);
            if (!result.Succeeded)
                return ApiResponse.FailureResult("Could not reset password",
                    result.Errors.Select(e => e.Description).ToList());

            await _refreshTokenRepository.RevokeUserTokensAsync(user.Id);
            await _refreshTokenRepository.SaveChangesAsync();
            return ApiResponse.SuccessResult("Password is changed");
        }

        public async Task<ApiResponse> ChangePasswordAsync(string userId, ChangePasswordRequest request)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return ApiResponse.FailureResult(ErrorConstants.AuthMessage.UserNotFound);
            }

            if (request.CurrentPassword == request.NewPassword)
            {
                return ApiResponse.FailureResult(ErrorConstants.AuthMessage.SamePassword);
            }

            if (!string.IsNullOrEmpty(request.ConfirmPassword) && request.NewPassword != request.ConfirmPassword)
            {
                return ApiResponse.FailureResult(ErrorConstants.AuthMessage.PasswordMismatch);
            }

            var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description).ToList();
                return ApiResponse.FailureResult("Change password failed", errors);
            }

            // Revoke active refresh tokens for security
            await _refreshTokenRepository.RevokeUserTokensAsync(userId);
            await _refreshTokenRepository.SaveChangesAsync();

            return ApiResponse.SuccessResult("Password changed successfully");
        }

        private static string GenerateTemporaryPassword()
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
            return new string(Enumerable.Range(0, 12)
            .Select(_ => chars[RandomNumberGenerator.GetInt32(chars.Length)])
            .ToArray());
        }

        // Format: BN-yyMMdd-XXXXXX (fits Patients.PatientCode NVARCHAR(20)).
        private static string GeneratePatientCode()
        {
            return $"BN-{DateTime.UtcNow:yyMMdd}-{RandomNumberGenerator.GetInt32(0, 1_000_000):D6}";
        }
    }
}
