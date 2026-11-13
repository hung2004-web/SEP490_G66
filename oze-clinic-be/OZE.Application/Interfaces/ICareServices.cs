using OZE.Common.Models;

namespace OZE.Application.Interfaces
{
    public interface IFollowUpCareService
    {
        Task<FollowUpContactResponse> RecordContactAsync(long examinationId, string userId, RecordFollowUpContactRequest request, CancellationToken cancellationToken = default);
        Task<List<FollowUpContactResponse>> GetContactsAsync(long examinationId, CancellationToken cancellationToken = default);
    }

    public interface IDebtService
    {
        Task<DebtListResponse> GetDebtsAsync(DebtQuery query, CancellationToken cancellationToken = default);
        Task<PaymentReminderResponse> RemindAsync(long invoiceId, string userId, RemindPaymentRequest request, CancellationToken cancellationToken = default);
        Task<List<PaymentReminderResponse>> GetRemindersAsync(long invoiceId, CancellationToken cancellationToken = default);
        Task<BatchPaymentReminderResponse> RemindDueInstallmentsAsync(DateOnly targetDate, CancellationToken cancellationToken = default);
        Task<PaymentHistoryResponse> GetPaymentHistoryAsync(PaymentHistoryQuery query, CancellationToken cancellationToken = default);
    }

    public interface IReconciliationService
    {
        Task<DailyReconciliationResponse> GetDailyAsync(DateOnly? date, CancellationToken cancellationToken = default);
        Task<DailyReconciliationResponse> ConfirmAsync(DateOnly date, string userId, ConfirmReconciliationRequest request, CancellationToken cancellationToken = default);
    }
}
