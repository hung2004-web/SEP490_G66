using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IAuditLogRepository
    {
        Task AddAsync(AuditLog auditLog);
        // The latest log of that action on that record, or null
        Task<AuditLog?> GetLatestAsync(string action, string entityType, string entityId);

        // Reading (clinic manager). Newest first; userIds narrows to these users when given (keyword search by name)
        Task<(List<AuditLog> Items, int TotalCount)> GetPageAsync(AuditLogQueryParameters query, DateTimeOffset? from, DateTimeOffset? to,
            IReadOnlyCollection<string>? keywordUserIds, int page, int pageSize, CancellationToken cancellationToken = default);
        Task<AuditLog?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
        // Name (staff or patient, else the account user name) and role of each user id
        Task<List<AuditActor>> GetActorsAsync(IReadOnlyCollection<string> userIds, CancellationToken cancellationToken = default);
        // Users whose name contains the keyword
        Task<List<string>> FindUserIdsByNameAsync(string keyword, CancellationToken cancellationToken = default);
    }
}
