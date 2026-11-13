using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Application.Interfaces
{
    public interface ICashSessionService
    {
        // Null when the receptionist has no open session
        Task<CashSessionResponse?> GetCurrentAsync(string userId, CancellationToken cancellationToken = default);
        Task<CashSessionResponse> OpenAsync(string userId, OpenCashSessionRequest request, CancellationToken cancellationToken = default);
        Task<CashSessionResponse> AddExpenseAsync(string userId, AddCashExpenseRequest request, CancellationToken cancellationToken = default);
        Task<CashSessionResponse> RemoveExpenseAsync(string userId, long expenseId, CancellationToken cancellationToken = default);
        Task<CashSessionResponse> CloseAsync(string userId, CloseCashSessionRequest request, CancellationToken cancellationToken = default);
        Task<List<StaffOption>> GetHandoverCandidatesAsync(string userId, CancellationToken cancellationToken = default);

        Task<CashSessionResponse> GetByIdAsync(string userId, bool isManager, long id, CancellationToken cancellationToken = default);
        Task<PagedResult<CashSessionSummaryResponse>> GetPagedAsync(string userId, bool isManager, CashSessionQuery query, CancellationToken cancellationToken = default);
    }
}
