using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;

namespace OZE.Persistence.Repositories
{
    public class RefundRepository : IRefundRepository
    {
        private readonly AppIdentityDbContext _context;

        public RefundRepository(AppIdentityDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(RefundAdjustmentRequest request, CancellationToken cancellationToken = default)
        {
            await _context.RefundAdjustmentRequests.AddAsync(request, cancellationToken);
        }

        public Task<RefundAdjustmentRequest?> GetByIdWithInvoiceAsync(long id, CancellationToken cancellationToken = default)
        {
            return _context.RefundAdjustmentRequests
                .Include(x => x.Invoice)
                    .ThenInclude(i => i.Payments)
                .Include(x => x.Invoice)
                    .ThenInclude(i => i.RefundAdjustmentRequests)
                .AsSplitQuery()
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        }

        public async Task<IReadOnlyList<RefundAdjustmentRequest>> GetListAsync(
            string? status,
            long? invoiceId,
            CancellationToken cancellationToken = default)
        {
            var query = _context.RefundAdjustmentRequests
                .AsNoTracking()
                .Include(x => x.Invoice)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
            {
                var normalized = status.Trim();
                query = query.Where(x => x.Status == normalized);
            }

            if (invoiceId.HasValue)
            {
                query = query.Where(x => x.InvoiceId == invoiceId.Value);
            }

            return await query
                .OrderByDescending(x => x.CreatedAt)
                .ThenByDescending(x => x.Id)
                .ToListAsync(cancellationToken);
        }

        public Task<bool> HasPendingForInvoiceAsync(long invoiceId, CancellationToken cancellationToken = default)
        {
            return _context.RefundAdjustmentRequests.AnyAsync(
                x => x.InvoiceId == invoiceId
                     && x.Status == PaymentConstants.RefundRequestStatus.Pending,
                cancellationToken);
        }

        public async Task<T> ExecuteInTransactionAsync<T>(
            Func<Task<T>> action,
            CancellationToken cancellationToken = default)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
                try
                {
                    var result = await action();
                    await transaction.CommitAsync(cancellationToken);
                    return result;
                }
                catch
                {
                    await transaction.RollbackAsync(cancellationToken);
                    throw;
                }
            });
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return _context.SaveChangesAsync(cancellationToken);
        }
    }
}
