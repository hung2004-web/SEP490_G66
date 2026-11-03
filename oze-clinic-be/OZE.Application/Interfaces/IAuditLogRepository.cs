using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IAuditLogRepository
    {
        Task AddAsync(AuditLog auditLog);
        // The latest log of that action on that record, or null
        Task<AuditLog?> GetLatestAsync(string action, string entityType, string entityId);
    }
}
