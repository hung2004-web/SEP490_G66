using OZE.Common.Models;

namespace OZE.Application.Interfaces
{
    public interface IInvoiceReportRepository
    {
        Task<int> CountNewInvoicesAsync(
            DateTimeOffset rangeStartInclusive,
            DateTimeOffset rangeEndExclusive,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<PaymentMethodTotal>> SumConfirmedPaymentsByMethodAsync(
            DateTimeOffset rangeStartInclusive,
            DateTimeOffset rangeEndExclusive,
            CancellationToken cancellationToken = default);

        Task<(int Count, decimal Amount)> GetOpenOutstandingAsync(CancellationToken cancellationToken = default);

        Task<(int DueCount, int OverdueCount)> CountInstallmentDueOverdueAsync(
            DateOnly asOfDate,
            CancellationToken cancellationToken = default);
    }
}
