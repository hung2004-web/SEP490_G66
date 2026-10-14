using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Middlewares;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.Services
{
    public class StaffService : IStaffService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IStaffRepository _staffRepository;
        private readonly IRegistrationRepository _registrationRepository;
        private readonly IUserRefreshTokenRepository _refreshTokenRepository;
        private readonly IEmailSender _emailSender;
        private readonly ILogger<StaffService> _logger;

        public StaffService(
            UserManager<ApplicationUser> userManager,
            IStaffRepository staffRepository,
            IRegistrationRepository registrationRepository,
            IUserRefreshTokenRepository refreshTokenRepository,
            IEmailSender emailSender,
            ILogger<StaffService> logger)
        {
            _userManager = userManager;
            _staffRepository = staffRepository;
            _registrationRepository = registrationRepository;
            _refreshTokenRepository = refreshTokenRepository;
            _emailSender = emailSender;
            _logger = logger;
        }

        public async Task<List<StaffResponse>> GetStaffListAsync(StaffQueryRequest query)
        {
            return await _staffRepository.GetAllAsync(query);
        }

        public async Task<StaffResponse> GetStaffAsync(string userId)
        {
            var (user, staff, role) = await GetExistingStaffAsync(userId);
            return ToResponse(user, staff, role);
        }

        public async Task<StaffResponse> CreateStaffAsync(CreateStaffRequest request)
        {
            ConditionGuard.Ensure(PhoneNumberHelper.TryNormalize(request.PhoneNumber, out var phoneNumber), ErrorConstants.AuthMessage.InvalidPhone);
            var (specialization, licenseNumber) = GetDoctorInfo(request);

            var email = request.Email.Trim();
            await EnsureUniqueAsync(email, PhoneNumberHelper.GetLookupVariants(phoneNumber), licenseNumber, null, 0);

            var now = DateTimeOffset.UtcNow;
            var staff = new StaffProfile
            {
                FullName = request.FullName.Trim(),
                PhoneNumber = phoneNumber,
                Specialization = specialization,
                LicenseNumber = licenseNumber,
                IsActive = true,
                CreatedAt = now
            };
            // Staff members sign in with their email.
            var user = new ApplicationUser
            {
                Id = Guid.NewGuid().ToString(),
                UserName = email,
                Email = email,
                PhoneNumber = phoneNumber,
                CreatedAt = now,
                StaffProfile = staff
            };

            var password = PasswordHelper.GenerateTemporaryPassword();
            var result = await _registrationRepository.ExecuteInTransactionAsync(
                () => CreateAccountAsync(user, request.Role, password),
                created => created.Succeeded);
            ConditionGuard.Ensure(result.Succeeded,
                result.Errors.FirstOrDefault()?.Description ?? ErrorConstants.StaffMessage.CreateFailed);

            return ToResponse(user, staff, request.Role);
        }

        public async Task<StaffResponse> UpdateStaffAsync(string userId, UpdateStaffRequest request, string managerId)
        {
            var (user, staff, currentRole) = await GetExistingStaffAsync(userId);

            ConditionGuard.Ensure(PhoneNumberHelper.TryNormalize(request.PhoneNumber, out var phoneNumber), ErrorConstants.AuthMessage.InvalidPhone);
            // A manager who changes their own role could leave the clinic without any Clinic Manager.
            ConditionGuard.ThrowIf(userId == managerId && request.Role != currentRole, ErrorConstants.StaffMessage.CannotChangeOwnRole);
            var (specialization, licenseNumber) = GetDoctorInfo(request);

            var email = request.Email.Trim();
            var phoneVariants = PhoneNumberHelper.GetLookupVariants(phoneNumber);
            await EnsureUniqueAsync(email, phoneVariants, licenseNumber, user.Id, staff.Id);

            var emailChanged = !string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase);
            var phoneChanged = user.PhoneNumber == null || !phoneVariants.Contains(user.PhoneNumber);

            // The user name is the email or the phone number the account was created with.
            if (emailChanged && string.Equals(user.UserName, user.Email, StringComparison.OrdinalIgnoreCase))
            {
                user.UserName = email;
            }
            if (phoneChanged && user.PhoneNumber != null && user.UserName == user.PhoneNumber)
            {
                user.UserName = phoneNumber;
            }

            // A contact entered by the manager has not been verified by the staff member.
            if (emailChanged)
            {
                user.Email = email;
                user.EmailConfirmed = false;
            }
            if (phoneChanged)
            {
                user.PhoneNumber = phoneNumber;
                user.PhoneNumberConfirmed = false;
            }
            if (emailChanged || phoneChanged)
            {
                user.SecurityStamp = Guid.NewGuid().ToString();
            }

            staff.FullName = request.FullName.Trim();
            staff.PhoneNumber = phoneNumber;
            staff.Specialization = specialization;
            staff.LicenseNumber = licenseNumber;
            staff.UpdatedAt = DateTimeOffset.UtcNow;

            var result = await _registrationRepository.ExecuteInTransactionAsync(
                () => SaveStaffAsync(user, currentRole, request.Role),
                saved => saved.Succeeded);
            ConditionGuard.Ensure(result.Succeeded,
                result.Errors.FirstOrDefault()?.Description ?? ErrorConstants.StaffMessage.UpdateFailed);

            return ToResponse(user, staff, request.Role);
        }

        public async Task<StaffResponse> DeactivateStaffAsync(string userId, string managerId)
        {
            var (user, staff, role) = await GetExistingStaffAsync(userId);
            ConditionGuard.ThrowIf(userId == managerId, ErrorConstants.StaffMessage.CannotDeactivateSelf);
            ConditionGuard.Ensure(staff.IsActive, ErrorConstants.StaffMessage.AlreadyInactive);

            // BR-088: the account is locked instead of deleted, so the staff member cannot log in.
            staff.IsActive = false;
            staff.UpdatedAt = DateTimeOffset.UtcNow;
            user.LockoutEnabled = true;
            user.LockoutEnd = DateTimeOffset.MaxValue;
            // Refresh does not check the lockout, so the sessions on every device are ended here.
            await _refreshTokenRepository.RevokeUserTokensAsync(user.Id);

            // Saves the account, its staff profile and the revoked tokens in one SaveChanges call (shared DbContext).
            var result = await _userManager.UpdateAsync(user);
            ConditionGuard.Ensure(result.Succeeded,
                result.Errors.FirstOrDefault()?.Description ?? ErrorConstants.StaffMessage.UpdateFailed);

            return ToResponse(user, staff, role);
        }

        public async Task<StaffResponse> ActivateStaffAsync(string userId)
        {
            var (user, staff, role) = await GetExistingStaffAsync(userId);
            ConditionGuard.Ensure(!staff.IsActive, ErrorConstants.StaffMessage.AlreadyActive);

            staff.IsActive = true;
            staff.UpdatedAt = DateTimeOffset.UtcNow;
            user.LockoutEnd = null;
            user.AccessFailedCount = 0;

            var result = await _userManager.UpdateAsync(user);
            ConditionGuard.Ensure(result.Succeeded,
                result.Errors.FirstOrDefault()?.Description ?? ErrorConstants.StaffMessage.UpdateFailed);

            return ToResponse(user, staff, role);
        }

        // The account, its staff profile and its role are created in one transaction, which is rolled back
        // if the login information cannot be emailed: the staff member would have no way to sign in.
        private async Task<IdentityResult> CreateAccountAsync(ApplicationUser user, string role, string password)
        {
            var result = await _userManager.CreateAsync(user, password);
            if (!result.Succeeded)
            {
                return result;
            }

            result = await _userManager.AddToRoleAsync(user, role);
            if (!result.Succeeded)
            {
                return result;
            }

            try
            {
                await _emailSender.SendTemporaryPasswordAsync(user, password);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send the login information to {Email} (UserId: {UserId})", user.Email, user.Id);
                return IdentityResult.Failed(new IdentityError { Description = ErrorConstants.AuthMessage.EmailCantSent });
            }

            return result;
        }

        // Specialization and license number are only kept for doctors.
        private static (string? Specialization, string? LicenseNumber) GetDoctorInfo(UpdateStaffRequest request)
        {
            if (request.Role != RoleConstants.DoctorRole)
            {
                return (null, null);
            }

            var specialization = string.IsNullOrWhiteSpace(request.Specialization) ? null : request.Specialization.Trim();
            var licenseNumber = string.IsNullOrWhiteSpace(request.LicenseNumber) ? null : request.LicenseNumber.Trim();
            // BR-088: a Doctor must have a license number.
            ConditionGuard.ThrowIf(licenseNumber == null, ErrorConstants.StaffMessage.LicenseNumberRequired);

            return (specialization, licenseNumber);
        }

        // BR-004: phone numbers and emails must be unique. License numbers are unique as well.
        // userId and staffId belong to the staff member being updated; they are null and 0 when a staff member is created.
        private async Task EnsureUniqueAsync(string email, string[] phoneVariants, string? licenseNumber, string? userId, int staffId)
        {
            var emailOwner = await _userManager.FindByEmailAsync(email);
            ConditionGuard.ThrowIf(emailOwner != null && emailOwner.Id != userId, ErrorConstants.AuthMessage.EmailExist);

            var phoneOwner = await _registrationRepository.FindUserByPhoneAsync(phoneVariants);
            ConditionGuard.ThrowIf(phoneOwner != null && phoneOwner.Id != userId, ErrorConstants.StaffMessage.PhoneExist);

            ConditionGuard.ThrowIf(licenseNumber != null && await _staffRepository.IsLicenseNumberInUseAsync(licenseNumber, staffId),
                ErrorConstants.StaffMessage.LicenseNumberExist);
        }

        // The account, its staff profile and its role are saved in one transaction.
        private async Task<IdentityResult> SaveStaffAsync(ApplicationUser user, string? currentRole, string newRole)
        {
            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded || currentRole == newRole)
            {
                return result;
            }

            // Each user has exactly one role (IX_AspNetUserRoles_UserId_Unique), so the old role is removed first.
            if (currentRole != null)
            {
                result = await _userManager.RemoveFromRoleAsync(user, currentRole);
                if (!result.Succeeded)
                {
                    return result;
                }
            }

            return await _userManager.AddToRoleAsync(user, newRole);
        }

        private async Task<(ApplicationUser User, StaffProfile Staff, string? Role)> GetExistingStaffAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            var staff = user == null ? null : await _staffRepository.GetByUserIdAsync(userId);
            ConditionGuard.Ensure<NotFoundException>(staff != null, ErrorConstants.StaffMessage.StaffNotFound);

            var roles = await _userManager.GetRolesAsync(user!);
            ConditionGuard.Ensure<NotFoundException>(!roles.Contains(RoleConstants.PatientRole), ErrorConstants.StaffMessage.StaffNotFound);

            return (user!, staff!, roles.FirstOrDefault());
        }

        private static StaffResponse ToResponse(ApplicationUser user, StaffProfile staff, string? role)
        {
            return new StaffResponse
            {
                UserId = user.Id,
                FullName = staff.FullName,
                Email = user.Email,
                PhoneNumber = user.PhoneNumber ?? staff.PhoneNumber,
                DateOfBirth = staff.DateOfBirth,
                Gender = staff.Gender,
                Role = role,
                Specialization = staff.Specialization,
                LicenseNumber = staff.LicenseNumber,
                HireDate = staff.HireDate,
                IsActive = staff.IsActive,
                UpdatedAt = staff.UpdatedAt
            };
        }
    }
}
