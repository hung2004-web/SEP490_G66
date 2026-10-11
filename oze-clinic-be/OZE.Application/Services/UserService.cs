using System.ComponentModel.DataAnnotations;
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
    public class UserService : IUserService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IPatientRepository _patientRepository;
        private readonly IRegistrationRepository _registrationRepository;
        private readonly IPendingProfileUpdateStore _pendingProfileUpdateStore;
        private readonly ISmsSender _smsSender;
        private readonly IEmailSender _emailSender;
        private readonly RegisterOtpSettings _otpSettings;
        private readonly ILogger<UserService> _logger;

        public UserService(
            UserManager<ApplicationUser> userManager,
            IPatientRepository patientRepository,
            IRegistrationRepository registrationRepository,
            IPendingProfileUpdateStore pendingProfileUpdateStore,
            ISmsSender smsSender,
            IEmailSender emailSender,
            IOptions<RegisterOtpSettings> otpOptions,
            ILogger<UserService> logger)
        {
            _userManager = userManager;
            _patientRepository = patientRepository;
            _registrationRepository = registrationRepository;
            _pendingProfileUpdateStore = pendingProfileUpdateStore;
            _smsSender = smsSender;
            _emailSender = emailSender;
            _otpSettings = otpOptions.Value;
            _logger = logger;
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

        public Task<bool> IsPhoneInUseAsync(string phoneNumber)
        {
            var inUse = _userManager.Users.Any(u => u.PhoneNumber == phoneNumber);
            return Task.FromResult(inUse);
        }

        public async Task<UserProfileResponse?> GetUserProfileAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return null;
            }

            var patient = await _patientRepository.GetByUserIdAsync(userId);
            return await ToProfileResponseAsync(user, patient);
        }

        public string? GetFullName(string userId)
        {
            return _userManager.Users
                .Where(u => u.Id == userId)
                .Select(u => u.StaffProfile != null ? u.StaffProfile.FullName
                           : u.Patient != null ? u.Patient.FullName
                           : null)
                .FirstOrDefault();
        }

        public async Task<ApiResponse<UpdateProfileResponse>> UpdateProfileAsync(string userId, UpdateProfileRequest request, string baseUrl)
        {
            if (!PhoneNumberHelper.TryNormalize(request.PhoneNumber, out var phoneNumber))
            {
                return ApiResponse<UpdateProfileResponse>.FailureResult(ErrorConstants.AuthMessage.InvalidPhone);
            }

            // BR-055: the date of birth cannot be in the future. The clinic works in Vietnam time (UTC+7).
            var dateOfBirth = request.DateOfBirth!.Value;
            if (dateOfBirth > DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7)))
            {
                return ApiResponse<UpdateProfileResponse>.FailureResult(ErrorConstants.AuthMessage.DateOfBirthInvalid);
            }

            var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
            if (email != null && (email.Length > 256 || !new EmailAddressAttribute().IsValid(email)))
            {
                return ApiResponse<UpdateProfileResponse>.FailureResult(ErrorConstants.AuthMessage.EmailInvalid);
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return ApiResponse<UpdateProfileResponse>.FailureResult(ErrorConstants.AuthMessage.UserNotFound);
            }

            var patient = await _patientRepository.GetByUserIdAsync(userId);
            if (patient == null)
            {
                return ApiResponse<UpdateProfileResponse>.FailureResult(ErrorConstants.ProfileMessage.PatientNotLinked);
            }

            var update = new PendingProfileUpdate
            {
                UserId = user.Id,
                SecurityStamp = user.SecurityStamp ?? string.Empty,
                FullName = request.FullName.Trim(),
                DateOfBirth = dateOfBirth,
                Gender = request.Gender,
                PhoneNumber = phoneNumber,
                Email = email,
                Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim()
            };

            var contactError = await CheckContactsAvailableAsync(user, patient, update);
            if (contactError != null)
            {
                return ApiResponse<UpdateProfileResponse>.FailureResult(contactError);
            }

            if (!IsPhoneChanged(user, update.PhoneNumber))
            {
                var saved = await SaveProfileAsync(user, patient, update, baseUrl);
                return saved.Success
                    ? ApiResponse<UpdateProfileResponse>.SuccessResult(new UpdateProfileResponse { Profile = saved.Data }, saved.Message)
                    : ApiResponse<UpdateProfileResponse>.FailureResult(saved.Message, saved.Errors);
            }

            // UC-08 step 5.2, BR-006: a new phone number is saved only after the OTP sent to it is verified.
            update.SessionId = Guid.NewGuid().ToString("N");
            var otp = OtpHelper.Generate();
            update.OtpHash = OtpHelper.Hash(update.SessionId, otp);
            if (!await SendPhoneOtpAsync(update, otp))
            {
                return ApiResponse<UpdateProfileResponse>.FailureResult(ErrorConstants.AuthMessage.OtpSendFailed);
            }

            var now = DateTime.UtcNow;
            update.ExpiresAt = now.AddMinutes(OtpExpiresInMinutes);
            update.LastSentAt = now;
            _pendingProfileUpdateStore.Save(update, update.ExpiresAt - now);

            return ApiResponse<UpdateProfileResponse>.SuccessResult(
                new UpdateProfileResponse { OtpRequired = true, OtpSession = ToOtpSessionResponse(update) },
                ErrorConstants.AuthMessage.OtpSentSms);
        }

        public async Task<ApiResponse<UserProfileResponse>> VerifyPhoneOtpAsync(string userId, VerifyOtpRequest request, string baseUrl)
        {
            var update = GetActiveSession(userId, request.SessionId);
            if (update == null)
            {
                return ApiResponse<UserProfileResponse>.FailureResult(ErrorConstants.ProfileMessage.OtpExpired);
            }

            if (update.FailedAttempts >= MaxAttempts)
            {
                _pendingProfileUpdateStore.Remove(update.SessionId);
                return ApiResponse<UserProfileResponse>.FailureResult(ErrorConstants.AuthMessage.InvalidOtp);
            }

            if (!OtpHelper.Matches(update.OtpHash, update.SessionId, request.Otp))
            {
                update.FailedAttempts++;
                if (update.FailedAttempts >= MaxAttempts)
                {
                    _pendingProfileUpdateStore.Remove(update.SessionId);
                }
                else
                {
                    _pendingProfileUpdateStore.Save(update, update.ExpiresAt - DateTime.UtcNow);
                }

                return ApiResponse<UserProfileResponse>.FailureResult(ErrorConstants.AuthMessage.InvalidOtp);
            }

            _pendingProfileUpdateStore.Remove(update.SessionId);

            var user = await _userManager.FindByIdAsync(userId);
            var patient = await _patientRepository.GetByUserIdAsync(userId);
            if (user == null || patient == null || user.SecurityStamp != update.SecurityStamp)
            {
                return ApiResponse<UserProfileResponse>.FailureResult(ErrorConstants.ProfileMessage.OtpExpired);
            }

            // The phone number or email may have been taken by another account while the OTP was pending.
            var contactError = await CheckContactsAvailableAsync(user, patient, update);
            if (contactError != null)
            {
                return ApiResponse<UserProfileResponse>.FailureResult(contactError);
            }

            return await SaveProfileAsync(user, patient, update, baseUrl);
        }

        public async Task<ApiResponse<RegisterPendingResponse>> ResendPhoneOtpAsync(string userId, ResendOtpRequest request)
        {
            var update = GetActiveSession(userId, request.SessionId);
            if (update == null)
            {
                return ApiResponse<RegisterPendingResponse>.FailureResult(ErrorConstants.ProfileMessage.OtpExpired);
            }

            if (DateTime.UtcNow < update.LastSentAt.AddSeconds(ResendCooldownSeconds))
            {
                return ApiResponse<RegisterPendingResponse>.FailureResult(ErrorConstants.AuthMessage.OtpResendTooSoon);
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null || user.SecurityStamp != update.SecurityStamp)
            {
                _pendingProfileUpdateStore.Remove(update.SessionId);
                return ApiResponse<RegisterPendingResponse>.FailureResult(ErrorConstants.ProfileMessage.OtpExpired);
            }

            // The previous OTP stays valid if the new one cannot be sent.
            var otp = OtpHelper.Generate();
            if (!await SendPhoneOtpAsync(update, otp))
            {
                return ApiResponse<RegisterPendingResponse>.FailureResult(ErrorConstants.AuthMessage.OtpSendFailed);
            }

            var now = DateTime.UtcNow;
            update.OtpHash = OtpHelper.Hash(update.SessionId, otp);
            update.LastSentAt = now;
            update.ExpiresAt = now.AddMinutes(OtpExpiresInMinutes);
            update.FailedAttempts = 0;
            _pendingProfileUpdateStore.Save(update, update.ExpiresAt - now);

            return ApiResponse<RegisterPendingResponse>.SuccessResult(ToOtpSessionResponse(update), ErrorConstants.AuthMessage.OtpSentSms);
        }

        // BR-004, BR-056: a new phone number or email cannot belong to another account or patient record.
        private async Task<string?> CheckContactsAvailableAsync(ApplicationUser user, Patient patient, PendingProfileUpdate update)
        {
            if (IsPhoneChanged(user, update.PhoneNumber))
            {
                var phoneVariants = PhoneNumberHelper.GetLookupVariants(update.PhoneNumber);
                var phoneOwner = await _registrationRepository.FindUserByPhoneAsync(phoneVariants);
                if ((phoneOwner != null && phoneOwner.Id != user.Id)
                    || await _patientRepository.IsPhoneInUseAsync(phoneVariants, patient.Id))
                {
                    return string.Format(ErrorConstants.AuthMessage.PhoneExist, update.PhoneNumber);
                }
            }

            if (update.Email != null && IsEmailChanged(user, update.Email))
            {
                var emailOwner = await _userManager.FindByEmailAsync(update.Email);
                if (emailOwner != null && emailOwner.Id != user.Id)
                {
                    return ErrorConstants.AuthMessage.EmailExist;
                }
            }

            return null;
        }

        // The account and its patient record are saved in one SaveChanges call because they share the DbContext.
        private async Task<ApiResponse<UserProfileResponse>> SaveProfileAsync(
            ApplicationUser user, Patient patient, PendingProfileUpdate update, string baseUrl)
        {
            var phoneChanged = IsPhoneChanged(user, update.PhoneNumber);
            var emailChanged = IsEmailChanged(user, update.Email);

            patient.FullName = update.FullName;
            patient.DateOfBirth = update.DateOfBirth;
            patient.Gender = update.Gender;
            patient.Email = update.Email;
            patient.Address = update.Address;
            patient.UpdatedAt = DateTimeOffset.UtcNow;

            if (phoneChanged)
            {
                // Register uses the phone number as the user name.
                if (user.UserName == user.PhoneNumber)
                {
                    user.UserName = update.PhoneNumber;
                }

                user.PhoneNumber = update.PhoneNumber;
                user.PhoneNumberConfirmed = true;
                patient.PhoneNumber = update.PhoneNumber;
            }

            if (emailChanged)
            {
                user.Email = update.Email;
                user.EmailConfirmed = false;
            }

            if (phoneChanged || emailChanged)
            {
                // Same as Identity's SetPhoneNumberAsync/SetEmailAsync; also ends other pending profile OTP sessions.
                user.SecurityStamp = Guid.NewGuid().ToString();
            }

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description).ToList();
                return ApiResponse<UserProfileResponse>.FailureResult(ErrorConstants.ProfileMessage.UpdateFailed, errors);
            }

            if (emailChanged && user.Email != null)
            {
                await SendEmailConfirmationAsync(user, baseUrl);
            }

            return ApiResponse<UserProfileResponse>.SuccessResult(
                await ToProfileResponseAsync(user, patient), ErrorConstants.ProfileMessage.ProfileUpdated);
        }

        private async Task SendEmailConfirmationAsync(ApplicationUser user, string baseUrl)
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
                // The profile is already saved, so an email failure must not fail the request.
                _logger.LogError(ex, "Failed to send confirmation email to {Email} (UserId: {UserId}) after profile update", user.Email, user.Id);
            }
        }

        private async Task<bool> SendPhoneOtpAsync(PendingProfileUpdate update, string otp)
        {
            try
            {
                await _smsSender.SendSmsAsync(
                    update.PhoneNumber,
                    $"Ma OTP OZE cua ban la {otp}. Hieu luc {OtpExpiresInMinutes} phut.");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send profile update OTP by SMS (UserId: {UserId})", update.UserId);
                return false;
            }
        }

        // A session of another account is treated as expired so its existence is not revealed.
        private PendingProfileUpdate? GetActiveSession(string userId, string sessionId)
        {
            var update = _pendingProfileUpdateStore.Get(sessionId);
            return update == null || update.UserId != userId || update.ExpiresAt <= DateTime.UtcNow
                ? null
                : update;
        }

        private static bool IsPhoneChanged(ApplicationUser user, string phoneNumber)
        {
            return user.PhoneNumber == null || !PhoneNumberHelper.GetLookupVariants(phoneNumber).Contains(user.PhoneNumber);
        }

        private static bool IsEmailChanged(ApplicationUser user, string? email)
        {
            return !string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase);
        }

        private async Task<UserProfileResponse> ToProfileResponseAsync(ApplicationUser user, Patient? patient)
        {
            return new UserProfileResponse
            {
                Id = user.Id,
                Email = user.Email ?? string.Empty,
                FullName = patient?.FullName ?? GetFullName(user.Id),
                PhoneNumber = user.PhoneNumber ?? patient?.PhoneNumber,
                DateOfBirth = patient?.DateOfBirth,
                Gender = patient?.Gender,
                Address = patient?.Address,
                Roles = await _userManager.GetRolesAsync(user)
            };
        }

        private RegisterPendingResponse ToOtpSessionResponse(PendingProfileUpdate update)
        {
            return new RegisterPendingResponse
            {
                SessionId = update.SessionId,
                VerificationMethod = VerificationMethodConstants.Sms,
                MaskedDestination = PhoneNumberHelper.Mask(update.PhoneNumber),
                ExpiresAt = update.ExpiresAt,
                ResendAvailableAt = update.LastSentAt.AddSeconds(ResendCooldownSeconds)
            };
        }

        private int OtpExpiresInMinutes => _otpSettings.ExpiresInMinutes > 0 ? _otpSettings.ExpiresInMinutes : 5;

        private int ResendCooldownSeconds => _otpSettings.ResendCooldownSeconds > 0 ? _otpSettings.ResendCooldownSeconds : 60;

        private int MaxAttempts => _otpSettings.MaxAttempts > 0 ? _otpSettings.MaxAttempts : 5;
    }
}
