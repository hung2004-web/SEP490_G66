using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
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
    }
}
