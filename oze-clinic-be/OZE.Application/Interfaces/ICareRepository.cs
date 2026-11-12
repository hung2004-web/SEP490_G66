using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    // Data access for customer care (follow-up calls), patient debts and payment reminders, and end-of-day reconciliation
    public interface ICareRepository
    {
        // ----- follow-up calls -----
        Task<Examination?> GetExaminationForContactAsync(long examinationId, CancellationToken cancellationToken = default);
        Task<List<FollowUpContact>> GetContactsAsync(long examinationId, CancellationToken cancellationToken = default);

        // ----- debts -----
        // Invoices still owing money (UNPAID, PARTIALLY_PAID, PENDING_CONFIRMATION), with patient and installment periods
        Task<List<Invoice>> GetOpenInvoicesAsync(string? keyword, CancellationToken cancellationToken = default);
        Task<Invoice?> GetInvoiceWithPatientAsync(long invoiceId, CancellationToken cancellationToken = default);
        Task<Dictionary<long, (int Count, DateTimeOffset Last)>> GetReminderStatsAsync(IEnumerable<long> invoiceIds, CancellationToken cancellationToken = default);
        Task<List<PaymentReminder>> GetRemindersAsync(long invoiceId, CancellationToken cancellationToken = default);
        Task AddReminderAsync(PaymentReminder reminder, CancellationToken cancellationToken = default);
        // Pending periods due on targetDate, and periods already overdue at today, of invoices still owing money
        Task<List<InstallmentPeriod>> GetPeriodsToRemindAsync(DateOnly targetDate, DateOnly today, CancellationToken cancellationToken = default);
        Task<Dictionary<long, DateTimeOffset>> GetLastReminderByPeriodAsync(IEnumerable<long> periodIds, CancellationToken cancellationToken = default);

        // ----- reconciliation -----
        Task<List<CashSession>> GetSessionsOpenedBetweenAsync(DateTimeOffset from, DateTimeOffset to, CancellationToken cancellationToken = default);
        Task<List<ConfirmedPaymentRow>> GetConfirmedPaymentsBetweenAsync(DateTimeOffset from, DateTimeOffset to, CancellationToken cancellationToken = default);
        Task<List<PendingTransferItem>> GetPendingTransfersBeforeAsync(DateTimeOffset to, CancellationToken cancellationToken = default);
        Task<List<RefundOfDayItem>> GetRefundsProcessedBetweenAsync(DateTimeOffset from, DateTimeOffset to, CancellationToken cancellationToken = default);
        Task<DailyReconciliation?> GetReconciliationAsync(DateOnly date, CancellationToken cancellationToken = default);
        Task AddReconciliationAsync(DailyReconciliation reconciliation, CancellationToken cancellationToken = default);

        // ----- payment history -----
        Task<(List<PaymentHistoryItem> Items, int Total, decimal Cash, decimal Transfer, decimal Pending)> GetPaymentHistoryAsync(
            PaymentHistoryQuery query, CancellationToken cancellationToken = default);

        Task<Dictionary<string, string>> GetStaffNamesAsync(IEnumerable<string?> userIds, CancellationToken cancellationToken = default);
        Task SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
