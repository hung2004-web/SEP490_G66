using Microsoft.EntityFrameworkCore;
using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;

namespace OZE.Persistence.Repositories
{
    public class HomeRepository : IHomeRepository
    {
        private readonly AppIdentityDbContext _context;

        public HomeRepository(AppIdentityDbContext context)
        {
            _context = context;
        }

        public async Task<List<StaffProfile>> GetActiveDoctorAsync(CancellationToken cancellationToken = default)
        {
            return await _context.StaffProfiles.AsNoTracking()
                .Where(x => x.IsActive && _context.UserRoles.Any(u => u.UserId == x.UserId && _context.Roles.Any(i => i.Id == u.RoleId && i.Name == RoleConstants.DoctorRole)))
                .OrderBy(x => x.FullName)
                .ToListAsync(cancellationToken);
        }

        public async Task<List<Service>> GetActiveServiceAsync(CancellationToken cancellationToken = default)
        {
            return await _context.Services.AsNoTracking()
                .Where(x => x.IsActive)
                .OrderBy(x => x.ServiceName)
                .ToListAsync(cancellationToken);
        }

        public async Task<PagedResult<StaffProfile>> GetActiveDoctorsPagedAsync(DoctorQueryParameters parameters, CancellationToken cancellationToken = default)
        {
            var query = _context.StaffProfiles.AsNoTracking()
                .Where(x => x.IsActive && _context.UserRoles.Any(u => u.UserId == x.UserId && _context.Roles.Any(i => i.Id == u.RoleId && i.Name == RoleConstants.DoctorRole)));

            if (!string.IsNullOrWhiteSpace(parameters.Specialization))
            {
                var spec = parameters.Specialization.Trim().ToLowerInvariant();
                query = query.Where(x => x.Specialization != null && x.Specialization.ToLower().Contains(spec));
            }

            var activeDoctors = await query.ToListAsync(cancellationToken);

            // In-memory diacritic-insensitive & case-insensitive search to strictly comply with BR-112
            if (!string.IsNullOrWhiteSpace(parameters.SearchKeyword))
            {
                var normKeyword = StringHelper.RemoveDiacritics(parameters.SearchKeyword.Trim());
                activeDoctors = activeDoctors
                    .Where(x => StringHelper.RemoveDiacritics(x.FullName).Contains(normKeyword, StringComparison.OrdinalIgnoreCase)
                             || (x.Specialization != null && StringHelper.RemoveDiacritics(x.Specialization).Contains(normKeyword, StringComparison.OrdinalIgnoreCase)))
                    .ToList();
            }

            // Sorting
            activeDoctors = parameters.SortBy?.Trim().ToLowerInvariant() switch
            {
                "fullname" or "name" => parameters.SortDescending
                    ? activeDoctors.OrderByDescending(x => x.FullName).ToList()
                    : activeDoctors.OrderBy(x => x.FullName).ToList(),
                "specialization" => parameters.SortDescending
                    ? activeDoctors.OrderByDescending(x => x.Specialization).ToList()
                    : activeDoctors.OrderBy(x => x.Specialization).ToList(),
                _ => activeDoctors.OrderBy(x => x.FullName).ToList()
            };

            var totalCount = activeDoctors.Count;
            var items = activeDoctors
                .Skip((parameters.PageNumber - 1) * parameters.PageSize)
                .Take(parameters.PageSize)
                .ToList();

            return new PagedResult<StaffProfile>(items, totalCount, parameters.PageNumber, parameters.PageSize);
        }

        public async Task<StaffProfile?> GetActiveDoctorByIdAsync(int id, CancellationToken cancellationToken = default)
        {
            return await _context.StaffProfiles.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.IsActive && _context.UserRoles.Any(u => u.UserId == x.UserId && _context.Roles.Any(i => i.Id == u.RoleId && i.Name == RoleConstants.DoctorRole)), cancellationToken);
        }
    }
}
