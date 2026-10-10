using System.ComponentModel.DataAnnotations;
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
        private readonly IUserRefreshTokenRepository _refreshTokenRepository;
        private readonly IJwtTokenGenerator _jwtTokenGenerator;
        private readonly IEmailSender _emailSender;
        private readonly ISmsSender _smsSender;
        private readonly IPendingRegistrationStore _pendingRegistrationStore;
        private readonly IRegistrationRepository _registrationRepository;
        private readonly JwtSettings _jwtSettings;
        private readonly RegisterOtpSettings _otpSettings;
        private readonly ILogger<AuthService> _logger;

        public AuthService(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IUserRefreshTokenRepository refreshTokenRepository,
            IJwtTokenGenerator jwtTokenGenerator,
            IEmailSender emailSender,
            ISmsSender smsSender,
            IPendingRegistrationStore pendingRegistrationStore,
            IRegistrationRepository registrationRepository,
            IOptions<JwtSettings> jwtOptions,
            IOptions<RegisterOtpSettings> otpOptions,
            ILogger<AuthService> logger)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _refreshTokenRepository = refreshTokenRepository;
            _jwtTokenGenerator = jwtTokenGenerator;
            _emailSender = emailSender;
            _smsSender = smsSender;
            _pendingRegistrationStore = pendingRegistrationStore;
            _registrationRepository = registrationRepository;
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

            // BR-055: the date of birth cannot be in the future. The clinic works in Vietnam time (UTC+7).
            var dateOfBirth = request.DateOfBirth!.Value;
            if (dateOfBirth > DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7)))
            {
                return ApiResponse<RegisterPendingResponse>.FailureResult(ErrorConstants.AuthMessage.DateOfBirthInvalid);
            }

            var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
            if (email != null && (email.Length > 256 || !new EmailAddressAttribute().IsValid(email)))
            {
                return ApiResponse<RegisterPendingResponse>.FailureResult(ErrorConstants.AuthMessage.EmailInvalid);
            }

            if (request.VerificationMethod == VerificationMethodConstants.Email && email == null)
            {
                return ApiResponse<RegisterPendingResponse>.FailureResult(ErrorConstants.AuthMessage.EmailRequired);
            }

            // An account that never finished OTP verification is reused, so the guest can sign up again.
            var user = await _registrationRepository.FindUserByPhoneAsync(PhoneNumberHelper.GetLookupVariants(phoneNumber));
            if (user != null && !await IsPendingRegistrationAsync(user))
            {
                return ApiResponse<RegisterPendingResponse>.FailureResult(
                    string.Format(ErrorConstants.AuthMessage.PhoneExist, request.PhoneNumber.Trim()));
            }

            if (email != null)
            {
                var emailOwner = await _userManager.FindByEmailAsync(email);
                if (emailOwner != null && emailOwner.Id != user?.Id)
                {
                    return ApiResponse<RegisterPendingResponse>.FailureResult(ErrorConstants.AuthMessage.EmailExist);
                }
            }

            var saved = await _registrationRepository.ExecuteInTransactionAsync(
                () => SaveUnverifiedUserAsync(user, phoneNumber, email, request.Password),
                result => result.Result.Succeeded);
            if (!saved.Result.Succeeded)
            {
                var errors = saved.Result.Errors.Select(e => e.Description).ToList();
                return ApiResponse<RegisterPendingResponse>.FailureResult("User registration failed", errors);
            }

            var now = DateTime.UtcNow;
            var pending = new PendingRegistration
            {
                SessionId = Guid.NewGuid().ToString("N"),
                UserId = saved.User.Id,
                SecurityStamp = saved.User.SecurityStamp ?? string.Empty,
                VerificationMethod = request.VerificationMethod,
                FullName = request.FullName.Trim(),
                DateOfBirth = dateOfBirth,
                Gender = request.Gender,
                Email = email,
                PhoneNumber = phoneNumber,
                ExpiresAt = now.AddMinutes(OtpExpiresInMinutes),
                LastSentAt = now,
                FailedAttempts = 0
            };

            var otp = OtpHelper.Generate();
            pending.OtpHash = OtpHelper.Hash(pending.SessionId, otp);
            if (!await SendOtpAsync(pending, otp))
            {
                return ApiResponse<RegisterPendingResponse>.FailureResult(ErrorConstants.AuthMessage.OtpSendFailed);
            }

            _pendingRegistrationStore.Save(pending, pending.ExpiresAt - now);

            return ApiResponse<RegisterPendingResponse>.SuccessResult(ToPendingResponse(pending), OtpSentMessage(pending));
        }

        public async Task<ApiResponse<RegisterPendingResponse>> ResendOtpAsync(ResendOtpRequest request)
        {
            var pending = _pendingRegistrationStore.Get(request.SessionId);
            if (pending == null || pending.ExpiresAt <= DateTime.UtcNow)
            {
                return ApiResponse<RegisterPendingResponse>.FailureResult(ErrorConstants.AuthMessage.OtpExpired);
            }

            if (DateTime.UtcNow < pending.LastSentAt.AddSeconds(ResendCooldownSeconds))
            {
                return ApiResponse<RegisterPendingResponse>.FailureResult(ErrorConstants.AuthMessage.OtpResendTooSoon);
            }

            if (await GetPendingUserAsync(pending) == null)
            {
                _pendingRegistrationStore.Remove(pending.SessionId);
                return ApiResponse<RegisterPendingResponse>.FailureResult(ErrorConstants.AuthMessage.OtpExpired);
            }

            // The previous OTP stays valid if the new one cannot be sent.
            var otp = OtpHelper.Generate();
            if (!await SendOtpAsync(pending, otp))
            {
                return ApiResponse<RegisterPendingResponse>.FailureResult(ErrorConstants.AuthMessage.OtpSendFailed);
            }

            var now = DateTime.UtcNow;
            pending.OtpHash = OtpHelper.Hash(pending.SessionId, otp);
            pending.LastSentAt = now;
            pending.ExpiresAt = now.AddMinutes(OtpExpiresInMinutes);
            pending.FailedAttempts = 0;
            _pendingRegistrationStore.Save(pending, pending.ExpiresAt - now);

            return ApiResponse<RegisterPendingResponse>.SuccessResult(ToPendingResponse(pending), OtpSentMessage(pending));
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

            if (!OtpHelper.Matches(pending.OtpHash, pending.SessionId, request.Otp))
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

            var user = await GetPendingUserAsync(pending);
            if (user == null)
            {
                _pendingRegistrationStore.Remove(pending.SessionId);
                return ApiResponse.FailureResult(ErrorConstants.AuthMessage.OtpExpired);
            }

            var activated = await _registrationRepository.ExecuteInTransactionAsync(
                () => ActivateAccountAsync(user, pending),
                result => result.Success);
            _pendingRegistrationStore.Remove(pending.SessionId);
            if (!activated.Success)
            {
                return activated;
            }

            if (pending.VerificationMethod == VerificationMethodConstants.Sms && user.Email != null)
            {
                try
                {
                    var code = await _userManager.GenerateEmailConfirmationTokenAsync(user);
                    var encodedCode = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(code));
                    var callbackUrl = $"{baseUrl}/api/auth/confirm-email?userId={user.Id}&code={encodedCode}";
                    await _emailSender.SendEmailVerificationAsync(user, callbackUrl);
                }
                catch (Exception ex)
                {
                    // Account is already created and the phone is verified, so an email failure must not fail the request.
                    _logger.LogError(ex, "Failed to send confirmation email to {Email} (UserId: {UserId}) after OTP verification", user.Email, user.Id);
                }
            }

            return activated;
        }

        private async Task<(IdentityResult Result, ApplicationUser User)> SaveUnverifiedUserAsync(
            ApplicationUser? user, string phoneNumber, string? email, string password)
        {
            var isNew = user == null;
            user ??= new ApplicationUser
            {
                Id = Guid.NewGuid().ToString(),
                CreatedAt = DateTimeOffset.UtcNow
            };

            user.UserName = phoneNumber;
            user.PhoneNumber = phoneNumber;
            user.PhoneNumberConfirmed = false;
            user.Email = email;
            user.EmailConfirmed = false;
            // The account cannot sign in until the OTP is verified.
            user.LockoutEnabled = true;
            user.LockoutEnd = DateTimeOffset.MaxValue;
            // Hashed here instead of CreateAsync(user, password): the Identity password policy differs from the 8-32 rule of Register.
            user.PasswordHash = _userManager.PasswordHasher.HashPassword(user, password);
            // A new stamp makes the OTP sessions of an earlier sign-up attempt invalid.
            user.SecurityStamp = Guid.NewGuid().ToString();

            var result = isNew ? await _userManager.CreateAsync(user) : await _userManager.UpdateAsync(user);
            if (result.Succeeded && !await _userManager.IsInRoleAsync(user, RoleConstants.PatientRole))
            {
                result = await _userManager.AddToRoleAsync(user, RoleConstants.PatientRole);
            }

            return (result, user);
        }

        private async Task<ApiResponse> ActivateAccountAsync(ApplicationUser user, PendingRegistration pending)
        {
            var walkInPatients = await _registrationRepository.FindUnlinkedPatientsByPhoneAsync(
                PhoneNumberHelper.GetLookupVariants(pending.PhoneNumber));

            if (pending.VerificationMethod == VerificationMethodConstants.Sms)
            {
                // BR-056, BR-058: the record with the same verified phone number is linked instead of creating a new one.
                if (walkInPatients.Count > 1)
                {
                    return ApiResponse.FailureResult(ErrorConstants.AuthMessage.MultiplePatientRecords);
                }

                if (walkInPatients.Count == 1)
                {
                    LinkPatient(walkInPatients[0], user, pending);
                }
                else
                {
                    user.Patient = CreatePatient(pending);
                }

                user.PhoneNumberConfirmed = true;
            }
            else
            {
                // The phone number is not verified, so a matching record is left for the reception desk to link (MSG39).
                if (walkInPatients.Count == 0)
                {
                    user.Patient = CreatePatient(pending);
                }

                user.EmailConfirmed = true;
            }

            user.LockoutEnd = null;
            user.AccessFailedCount = 0;

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description).ToList();
                return ApiResponse.FailureResult("User registration failed", errors);
            }

            return ApiResponse.SuccessResult(ErrorConstants.AuthMessage.AccountCreated);
        }

        private static Patient CreatePatient(PendingRegistration pending)
        {
            return new Patient
            {
                PatientCode = GeneratePatientCode(),
                FullName = pending.FullName,
                DateOfBirth = pending.DateOfBirth,
                Gender = pending.Gender,
                PhoneNumber = pending.PhoneNumber,
                Email = pending.Email,
                CreatedAt = DateTimeOffset.UtcNow
            };
        }

        // Only empty fields are filled; data entered by the reception desk is kept.
        private static void LinkPatient(Patient patient, ApplicationUser user, PendingRegistration pending)
        {
            patient.UserId = user.Id;
            patient.DateOfBirth ??= pending.DateOfBirth;
            if (string.IsNullOrWhiteSpace(patient.Gender))
            {
                patient.Gender = pending.Gender;
            }
            if (string.IsNullOrWhiteSpace(patient.Email))
            {
                patient.Email = pending.Email;
            }
            patient.UpdatedAt = DateTimeOffset.UtcNow;
        }

        // Returns the account of the OTP session while it is still waiting for verification.
        private async Task<ApplicationUser?> GetPendingUserAsync(PendingRegistration pending)
        {
            var user = await _userManager.FindByIdAsync(pending.UserId);
            if (user == null || user.SecurityStamp != pending.SecurityStamp || !await IsPendingRegistrationAsync(user))
            {
                return null;
            }

            return user;
        }

        private async Task<bool> IsPendingRegistrationAsync(ApplicationUser user)
        {
            return !user.PhoneNumberConfirmed
                && !user.EmailConfirmed
                && user.LockoutEnd == DateTimeOffset.MaxValue
                && await _userManager.IsInRoleAsync(user, RoleConstants.PatientRole);
        }

        private async Task<bool> SendOtpAsync(PendingRegistration pending, string otp)
        {
            try
            {
                if (pending.VerificationMethod == VerificationMethodConstants.Email)
                {
                    await _emailSender.SendRegistrationOtpAsync(pending.Email!, pending.FullName, otp, OtpExpiresInMinutes);
                }
                else
                {
                    await _smsSender.SendSmsAsync(
                        pending.PhoneNumber,
                        $"Ma OTP OZE cua ban la {otp}. Hieu luc {OtpExpiresInMinutes} phut.");
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send registration OTP by {Method} (UserId: {UserId})", pending.VerificationMethod, pending.UserId);
                return false;
            }
        }

        private int OtpExpiresInMinutes => _otpSettings.ExpiresInMinutes > 0 ? _otpSettings.ExpiresInMinutes : 5;

        private int ResendCooldownSeconds => _otpSettings.ResendCooldownSeconds > 0 ? _otpSettings.ResendCooldownSeconds : 60;

        private static string OtpSentMessage(PendingRegistration pending)
        {
            return pending.VerificationMethod == VerificationMethodConstants.Email
                ? ErrorConstants.AuthMessage.OtpSentEmail
                : ErrorConstants.AuthMessage.OtpSentSms;
        }

        private RegisterPendingResponse ToPendingResponse(PendingRegistration pending)
        {
            return new RegisterPendingResponse
            {
                SessionId = pending.SessionId,
                VerificationMethod = pending.VerificationMethod,
                MaskedDestination = pending.VerificationMethod == VerificationMethodConstants.Email
                    ? MaskEmail(pending.Email!)
                    : PhoneNumberHelper.Mask(pending.PhoneNumber),
                ExpiresAt = pending.ExpiresAt,
                ResendAvailableAt = pending.LastSentAt.AddSeconds(ResendCooldownSeconds)
            };
        }

        private static string MaskEmail(string email)
        {
            var atIndex = email.IndexOf('@');
            if (atIndex <= 1)
            {
                return email;
            }

            var visible = Math.Min(2, atIndex - 1);
            return email[..visible] + new string('*', atIndex - visible) + email[atIndex..];
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

        public async Task<ApiResponse> LogoutAsync(string userId, string? refreshToken = null)
        {
            if (string.IsNullOrWhiteSpace(refreshToken))
            {
                // No token supplied: sign out of every device.
                await _refreshTokenRepository.RevokeUserTokensAsync(userId);
            }
            else
            {
                // Only end the session of the device that sent this refresh token.
                var token = await _refreshTokenRepository.GetActiveTokenAsync(refreshToken);
                if (token != null && token.UserId == userId)
                {
                    token.RevokedAt = DateTimeOffset.UtcNow;
                    await _refreshTokenRepository.UpdateAsync(token);
                }
            }

            await _refreshTokenRepository.SaveChangesAsync();

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

        private static string GenerateTemporaryPassword(int length = 12)
        {
            const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
            const string lower = "abcdefghijkmnpqrstuvwxyz";
            const string digits = "23456789";
            const string all = upper + lower + digits;

            var chars = new char[length];
            chars[0] = upper[RandomNumberGenerator.GetInt32(upper.Length)];
            chars[1] = lower[RandomNumberGenerator.GetInt32(lower.Length)];
            chars[2] = digits[RandomNumberGenerator.GetInt32(digits.Length)];
            for (var i = 3; i < length; i++)
                chars[i] = all[RandomNumberGenerator.GetInt32(all.Length)];

         
            for (var i = length - 1; i > 0; i--)
            {
                var j = RandomNumberGenerator.GetInt32(i + 1);
                (chars[i], chars[j]) = (chars[j], chars[i]);
            }

            return new string(chars);
        }

        // Format: BN-yyMMdd-XXXXXX (fits Patients.PatientCode NVARCHAR(20)).
        private static string GeneratePatientCode()
        {
            return $"BN-{DateTime.UtcNow:yyMMdd}-{RandomNumberGenerator.GetInt32(0, 1_000_000):D6}";
        }
    }
}
