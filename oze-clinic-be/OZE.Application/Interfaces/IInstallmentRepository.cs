using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IInstallmentRepository
    {
        Task AddPlanAsync(InstallmentPlan plan, CancellationToken cancellationToken = default);

        Task<InstallmentPlan?> GetPlanByInvoiceIdAsync(long invoiceId, CancellationToken cancellationToken = default);

        Task<bool> HasPlanForInvoiceAsync(long invoiceId, CancellationToken cancellationToken = default);

        Task<IReadOnlyList<InstallmentPeriod>> GetDuePeriodsAsync(
            DateOnly asOfDate,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Flips Pending → Overdue when DueDate &lt; asOfDate. Returns number of rows updated.
        /// </summary>
        Task<int> MarkPendingPastDueAsOverdueAsync(
            DateOnly asOfDate,
            CancellationToken cancellationToken = default);

        Task SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
