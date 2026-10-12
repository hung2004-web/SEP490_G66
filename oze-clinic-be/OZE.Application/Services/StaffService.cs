using Microsoft.AspNetCore.Identity;
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

        public StaffService(
            UserManager<ApplicationUser> userManager,
            IStaffRepository staffRepository,
            IRegistrationRepository registrationRepository,
            IUserRefreshTokenRepository refreshTokenRepository)
        {
            _userManager = userManager;
            _staffRepository = staffRepository;
            _registrationRepository = registrationRepository;
            _refreshTokenRepository = refreshTokenRepository;
        }

        public async Task<StaffResponse> GetStaffAsync(string userId)
        {
            var (user, staff, role) = await GetExistingStaffAsync(userId);
            return ToResponse(user, staff, role);
        }

        public async Task<StaffResponse> UpdateStaffAsync(string userId, UpdateStaffRequest request, string managerId)
        {
            var (user, staff, currentRole) = await GetExistingStaffAsync(userId);

            ConditionGuard.Ensure(PhoneNumberHelper.TryNormalize(request.PhoneNumber, out var phoneNumber), ErrorConstants.AuthMessage.InvalidPhone);
            // A manager who changes their own role could leave the clinic without any Clinic Manager.
            ConditionGuard.ThrowIf(userId == managerId && request.Role != currentRole, ErrorConstants.StaffMessage.CannotChangeOwnRole);

            var isDoctor = request.Role == RoleConstants.DoctorRole;
            var licenseNumber = isDoctor && !string.IsNullOrWhiteSpace(request.LicenseNumber) ? request.LicenseNumber.Trim() : null;
            // BR-088: a Doctor must have a license number.
            ConditionGuard.ThrowIf(isDoctor && licenseNumber == null, ErrorConstants.StaffMessage.LicenseNumberRequired);

            // BR-004: phone numbers and emails must be unique.
            var email = request.Email.Trim();
            var emailOwner = await _userManager.FindByEmailAsync(email);
            ConditionGuard.ThrowIf(emailOwner != null && emailOwner.Id != user.Id, ErrorConstants.AuthMessage.EmailExist);

            var phoneVariants = PhoneNumberHelper.GetLookupVariants(phoneNumber);
            var phoneOwner = await _registrationRepository.FindUserByPhoneAsync(phoneVariants);
            ConditionGuard.ThrowIf(phoneOwner != null && phoneOwner.Id != user.Id, ErrorConstants.StaffMessage.PhoneExist);

            ConditionGuard.ThrowIf(licenseNumber != null && await _staffRepository.IsLicenseNumberInUseAsync(licenseNumber, staff.Id),
                ErrorConstants.StaffMessage.LicenseNumberExist);

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
            staff.Specialization = isDoctor && !string.IsNullOrWhiteSpace(request.Specialization) ? request.Specialization.Trim() : null;
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
                Role = role,
                Specialization = staff.Specialization,
                LicenseNumber = staff.LicenseNumber,
                IsActive = staff.IsActive,
                UpdatedAt = staff.UpdatedAt
            };
        }
    }
}
