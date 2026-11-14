using OZE.Common.Models;

namespace OZE.Application.Interfaces
{
    // Reading the audit log (clinic manager). The log itself is written by IAuditLogService and is never edited or deleted.
    public interface IAuditLogQueryService
    {
        Task<AuditLogListResponse> GetPagedAsync(AuditLogQueryParameters query, CancellationToken cancellationToken = default);
        Task<AuditLogDetailResponse> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    }
}
