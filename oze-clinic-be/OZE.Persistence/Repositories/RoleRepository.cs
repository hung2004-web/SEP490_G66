using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Common.Models;
using OZE.Persistence.DbContexts;

namespace OZE.Persistence.Repositories
{
    public class RoleRepository : IRoleRepository
    {
        private readonly AppIdentityDbContext _context;

        public RoleRepository(AppIdentityDbContext context)
        {
            _context = context;
        }

        public async Task<List<RoleResponse>> GetAllAsync(RoleQueryRequest query)
        {
            var roles = QueryRoles();

            if (!string.IsNullOrWhiteSpace(query.Keyword))
            {
                var keyword = query.Keyword.Trim();
                roles = roles.Where(x => x.Name.Contains(keyword)
                    || (x.Description != null && x.Description.Contains(keyword)));
            }

            if (query.IsActive.HasValue)
            {
                roles = roles.Where(x => x.IsActive == query.IsActive.Value);
            }

            return await roles.OrderBy(x => x.Name).ToListAsync();
        }

        public async Task<RoleResponse?> GetByIdAsync(string id)
        {
            return await QueryRoles().FirstOrDefaultAsync(x => x.Id == id);
        }

        // The user count is read in the same query, instead of one query per role.
        private IQueryable<RoleResponse> QueryRoles()
        {
            return _context.Roles.AsNoTracking().Select(role => new RoleResponse
            {
                Id = role.Id,
                Name = role.Name ?? string.Empty,
                Description = role.Description,
                IsActive = role.IsActive,
                UserCount = _context.UserRoles.Count(userRole => userRole.RoleId == role.Id),
                CreatedAt = role.CreatedAt,
                UpdatedAt = role.UpdatedAt
            });
        }
    }
}
