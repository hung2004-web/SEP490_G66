using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;

namespace OZE.Persistence.Repositories
{
    public class StaffRepository : IStaffRepository
    {
        private readonly AppIdentityDbContext _context;

        public StaffRepository(AppIdentityDbContext context)
        {
            _context = context;
        }

        // The role is read in the same query, instead of one UserManager.GetRolesAsync call per staff member.
        public async Task<List<StaffResponse>> GetAllAsync(StaffQueryRequest query)
        {
            var staff = from profile in _context.StaffProfiles.AsNoTracking()
                        join user in _context.Users on profile.UserId equals user.Id
                        select new StaffResponse
                        {
                            UserId = user.Id,
                            FullName = profile.FullName,
                            Email = user.Email,
                            PhoneNumber = user.PhoneNumber ?? profile.PhoneNumber,
                            DateOfBirth = profile.DateOfBirth,
                            Gender = profile.Gender,
                            Role = (from userRole in _context.UserRoles
                                    join role in _context.Roles on userRole.RoleId equals role.Id
                                    where userRole.UserId == user.Id
                                    select role.Name).FirstOrDefault(),
                            Specialization = profile.Specialization,
                            LicenseNumber = profile.LicenseNumber,
                            HireDate = profile.HireDate,
                            IsActive = profile.IsActive,
                            UpdatedAt = profile.UpdatedAt
                        };

            staff = staff.Where(x => x.Role != RoleConstants.PatientRole);

            if (!string.IsNullOrWhiteSpace(query.Keyword))
            {
                var keyword = query.Keyword.Trim();
                // Phone numbers are stored as +84..., while the manager usually types them starting with 0.
                var phoneKeyword = keyword.StartsWith('0') ? "+84" + keyword[1..] : keyword;
                staff = staff.Where(x => x.FullName.Contains(keyword)
                    || (x.Email != null && x.Email.Contains(keyword))
                    || (x.PhoneNumber != null && (x.PhoneNumber.Contains(keyword) || x.PhoneNumber.Contains(phoneKeyword))));
            }

            if (!string.IsNullOrWhiteSpace(query.Role))
            {
                staff = staff.Where(x => x.Role == query.Role);
            }

            if (query.IsActive.HasValue)
            {
                staff = staff.Where(x => x.IsActive == query.IsActive.Value);
            }

            return await staff.OrderBy(x => x.FullName).ToListAsync();
        }

        public async Task<StaffProfile?> GetByUserIdAsync(string userId)
        {
            return await _context.StaffProfiles.FirstOrDefaultAsync(x => x.UserId == userId);
        }

        public async Task<bool> IsLicenseNumberInUseAsync(string licenseNumber, int excludedStaffId)
        {
            return await _context.StaffProfiles
                .AnyAsync(x => x.Id != excludedStaffId && x.LicenseNumber == licenseNumber);
        }
    }
}
