using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IRefundRepository
    {
        Task AddAsync(RefundAdjustmentRequest request, CancellationToken cancellationToken = default);

        Task<RefundAdjustmentRequest?> GetByIdWithInvoiceAsync(long id, CancellationToken cancellationToken = default);

        Task<IReadOnlyList<RefundAdjustmentRequest>> GetListAsync(
            string? status,
            long? invoiceId,
            CancellationToken cancellationToken = default);

        Task<bool> HasPendingForInvoiceAsync(long invoiceId, CancellationToken cancellationToken = default);

        Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> action, CancellationToken cancellationToken = default);

        Task SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
