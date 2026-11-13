using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface ICashSessionRepository
    {
        Task<CashSession?> GetOpenByUserAsync(string userId, CancellationToken cancellationToken = default);
        Task<CashSession?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
        Task<PagedResult<CashSession>> GetPagedAsync(CashSessionQuery query, string? openedByUserId, CancellationToken cancellationToken = default);
        Task AddAsync(CashSession session, CancellationToken cancellationToken = default);
        void RemoveExpense(CashExpense expense);

        // Confirmed payments whose confirmation was done by that user in [from, to)
        Task<List<CashSessionPaymentItem>> GetPaymentsConfirmedByAsync(string userId, DateTimeOffset from, DateTimeOffset to, CancellationToken cancellationToken = default);

        Task<Dictionary<string, string>> GetStaffNamesAsync(IEnumerable<string> userIds, CancellationToken cancellationToken = default);
        Task<List<StaffOption>> GetActiveReceptionistsAsync(CancellationToken cancellationToken = default);

        Task SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
