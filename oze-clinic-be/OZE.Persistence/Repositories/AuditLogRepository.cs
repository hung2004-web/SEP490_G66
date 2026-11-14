using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Common.Models;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;

namespace OZE.Persistence.Repositories
{
    public class AuditLogRepository : IAuditLogRepository
    {
        private readonly AppIdentityDbContext _context;

        public AuditLogRepository(AppIdentityDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(AuditLog auditLog)
        {
            await _context.AuditLogs.AddAsync(auditLog);
            await _context.SaveChangesAsync();
        }

        public async Task<AuditLog?> GetLatestAsync(string action, string entityType, string entityId)
        {
            return await _context.AuditLogs
                .AsNoTracking()
                .Where(x => x.Action == action && x.EntityType == entityType && x.EntityId == entityId)
                .OrderByDescending(x => x.CreatedAt)
                .ThenByDescending(x => x.Id)
                .FirstOrDefaultAsync();
        }

        public async Task<(List<AuditLog> Items, int TotalCount)> GetPageAsync(AuditLogQueryParameters query, DateTimeOffset? from, DateTimeOffset? to,
            IReadOnlyCollection<string>? keywordUserIds, int page, int pageSize, CancellationToken cancellationToken = default)
        {
            var logs = _context.AuditLogs.AsNoTracking().AsQueryable();
            if (from.HasValue)
            {
                logs = logs.Where(x => x.CreatedAt >= from.Value);
            }
            if (to.HasValue)
            {
                logs = logs.Where(x => x.CreatedAt < to.Value);
            }
            if (!string.IsNullOrWhiteSpace(query.UserId))
            {
                logs = logs.Where(x => x.UserId == query.UserId);
            }
            if (!string.IsNullOrWhiteSpace(query.Action))
            {
                logs = logs.Where(x => x.Action == query.Action.Trim());
            }
            if (!string.IsNullOrWhiteSpace(query.EntityType))
            {
                logs = logs.Where(x => x.EntityType == query.EntityType.Trim());
            }
            if (!string.IsNullOrWhiteSpace(query.EntityId))
            {
                logs = logs.Where(x => x.EntityId == query.EntityId.Trim());
            }
            if (!string.IsNullOrWhiteSpace(query.Keyword))
            {
                // A person found by name, an IP address, or a record id
                var keyword = query.Keyword.Trim();
                var userIds = keywordUserIds ?? Array.Empty<string>();
                logs = logs.Where(x => (x.UserId != null && userIds.Contains(x.UserId))
                    || (x.IpAddress != null && x.IpAddress.Contains(keyword))
                    || x.EntityId == keyword);
            }

            var total = await logs.CountAsync(cancellationToken);
            var items = await logs
                .OrderByDescending(x => x.CreatedAt)
                .ThenByDescending(x => x.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken);
            return (items, total);
        }

        public Task<AuditLog?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
        {
            return _context.AuditLogs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        }

        public async Task<List<AuditActor>> GetActorsAsync(IReadOnlyCollection<string> userIds, CancellationToken cancellationToken = default)
        {
            if (userIds.Count == 0)
            {
                return new List<AuditActor>();
            }

            var accounts = await _context.Users.AsNoTracking()
                .Where(u => userIds.Contains(u.Id))
                .Select(u => new { u.Id, u.UserName })
                .ToListAsync(cancellationToken);
            var staffNames = await _context.StaffProfiles.AsNoTracking()
                .Where(s => userIds.Contains(s.UserId))
                .Select(s => new { s.UserId, s.FullName })
                .ToListAsync(cancellationToken);
            var patientNames = await _context.Patients.AsNoTracking()
                .Where(p => p.UserId != null && userIds.Contains(p.UserId))
                .Select(p => new { UserId = p.UserId!, p.FullName })
                .ToListAsync(cancellationToken);
            var roles = await (
                from userRole in _context.UserRoles.AsNoTracking()
                join role in _context.Roles on userRole.RoleId equals role.Id
                where userIds.Contains(userRole.UserId)
                select new { userRole.UserId, role.Name })
                .ToListAsync(cancellationToken);

            return accounts.Select(a => new AuditActor(
                    a.Id,
                    staffNames.FirstOrDefault(s => s.UserId == a.Id)?.FullName
                        ?? patientNames.FirstOrDefault(p => p.UserId == a.Id)?.FullName
                        ?? a.UserName,
                    roles.FirstOrDefault(r => r.UserId == a.Id)?.Name))
                .ToList();
        }

        public async Task<List<string>> FindUserIdsByNameAsync(string keyword, CancellationToken cancellationToken = default)
        {
            var staff = await _context.StaffProfiles.AsNoTracking()
                .Where(s => s.FullName.Contains(keyword))
                .Select(s => s.UserId)
                .ToListAsync(cancellationToken);
            var patients = await _context.Patients.AsNoTracking()
                .Where(p => p.UserId != null && p.FullName.Contains(keyword))
                .Select(p => p.UserId!)
                .ToListAsync(cancellationToken);
            return staff.Concat(patients).Distinct().ToList();
        }
    }
}
