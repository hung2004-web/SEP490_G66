using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
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
