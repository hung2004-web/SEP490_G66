using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;

namespace OZE.Persistence.Repositories
{
    public class PaymentRepository : IPaymentRepository
    {
        private readonly AppIdentityDbContext _context;

        public PaymentRepository(AppIdentityDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(Payment payment, CancellationToken cancellationToken = default)
        {
            await _context.Payments.AddAsync(payment, cancellationToken);
        }

        public Task<Payment?> GetByIdWithInvoiceAsync(long id, CancellationToken cancellationToken = default)
        {
            return _context.Payments
                .Include(x => x.Invoice)
                    .ThenInclude(i => i.Payments)
                .Include(x => x.Invoice)
                    .ThenInclude(i => i.InstallmentPlans)
                        .ThenInclude(p => p.Periods)
                .Include(x => x.InstallmentPeriod)
                .AsSplitQuery()
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
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
