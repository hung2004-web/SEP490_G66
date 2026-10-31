using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IAuditLogRepository
    {
        Task AddAsync(AuditLog auditLog);
    }
}
