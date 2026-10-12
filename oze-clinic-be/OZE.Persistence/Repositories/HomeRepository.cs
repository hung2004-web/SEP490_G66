using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Persistence.Repositories
{
    public class HomeRepository : IHomeRepository
    {
        private readonly AppIdentityDbContext _context;
        public HomeRepository(AppIdentityDbContext context)
        {
            _context = context;
        }
        public async Task<List<StaffProfile>> GetActiveDoctorAsync()
        {
            return await _context.StaffProfiles.AsNoTracking().Where(x => x.IsActive && _context.UserRoles.Any(u => u.UserId == x.UserId && _context.Roles.Any(i => i.Id == u.RoleId && i.Name == RoleConstants.DoctorRole))).OrderBy(x => x.FullName).ToListAsync();
        }

        public async Task<List<Service>> GetActiveServiceAsync()
        {
            return await _context.Services.AsNoTracking().Where(x => x.IsActive).OrderBy(x => x.ServiceName).ToListAsync();
        }
    }
}
