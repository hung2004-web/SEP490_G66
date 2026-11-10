using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Persistence.DbContexts;

namespace OZE.Persistence.Repositories
{
    public class InvoiceReportRepository : IInvoiceReportRepository
    {
        private static readonly string[] OutstandingStatuses =
        {
            InvoiceConstants.Unpaid,
            InvoiceConstants.PendingConfirmation,
            InvoiceConstants.PartiallyPaid
        };

        private readonly AppIdentityDbContext _context;

        public InvoiceReportRepository(AppIdentityDbContext context)
        {
            _context = context;
        }

        public Task<int> CountNewInvoicesAsync(
            DateTimeOffset rangeStartInclusive,
            DateTimeOffset rangeEndExclusive,
            CancellationToken cancellationToken = default)
        {
            return _context.Invoices
                .AsNoTracking()
                .CountAsync(
                    x => x.CreatedAt >= rangeStartInclusive
                         && x.CreatedAt < rangeEndExclusive
                         && x.PaymentStatus != InvoiceConstants.Cancelled,
                    cancellationToken);
        }

        public async Task<IReadOnlyList<PaymentMethodTotal>> SumConfirmedPaymentsByMethodAsync(
            DateTimeOffset rangeStartInclusive,
            DateTimeOffset rangeEndExclusive,
            CancellationToken cancellationToken = default)
        {
            var rows = await _context.Payments
                .AsNoTracking()
                .Where(x =>
                    x.PaymentStatus == PaymentConstants.Confirmed
                    && x.PaidAt != null
                    && x.PaidAt >= rangeStartInclusive
                    && x.PaidAt < rangeEndExclusive)
                .GroupBy(x => x.PaymentMethod)
                .Select(g => new PaymentMethodTotal
                {
                    PaymentMethod = g.Key,
                    Amount = g.Sum(p => p.Amount),
                    PaymentCount = g.Count()
                })
                .ToListAsync(cancellationToken);

            var byMethod = rows.ToDictionary(r => r.PaymentMethod, StringComparer.OrdinalIgnoreCase);
            var result = new List<PaymentMethodTotal>(PaymentConstants.Methods.Length + rows.Count);

            foreach (var method in PaymentConstants.Methods)
            {
                if (byMethod.TryGetValue(method, out var existing))
                {
                    result.Add(RoundTotal(method, existing.Amount, existing.PaymentCount));
                    byMethod.Remove(method);
                }
                else
                {
                    result.Add(RoundTotal(method, 0m, 0));
                }
            }

            // Preserve unexpected methods so ConfirmedCollectionsTotal stays complete.
            foreach (var leftover in byMethod.Values.OrderBy(x => x.PaymentMethod))
            {
                result.Add(RoundTotal(leftover.PaymentMethod, leftover.Amount, leftover.PaymentCount));
            }

            return result;
        }

        public async Task<(int Count, decimal Amount)> GetOpenOutstandingAsync(
            CancellationToken cancellationToken = default)
        {
            var rows = await _context.Invoices
                .AsNoTracking()
                .Where(x => OutstandingStatuses.Contains(x.PaymentStatus))
                .Select(x => new { x.FinalAmount, x.PaidAmount })
                .ToListAsync(cancellationToken);

            var outstanding = rows
                .Select(x => decimal.Round(Math.Max(0m, x.FinalAmount - x.PaidAmount), 2, MidpointRounding.AwayFromZero))
                .Where(remaining => remaining > 0)
                .ToList();

            return (
                outstanding.Count,
                decimal.Round(outstanding.Sum(), 2, MidpointRounding.AwayFromZero));
        }

        public async Task<(int DueCount, int OverdueCount)> CountInstallmentDueOverdueAsync(
            DateOnly asOfDate,
            CancellationToken cancellationToken = default)
        {
            // Read-only snapshot: treat Pending with DueDate < asOf as overdue without persisting.
            var baseQuery = _context.InstallmentPeriods
                .AsNoTracking()
                .Where(x => x.InstallmentPlan.Invoice.PaymentStatus != InvoiceConstants.Cancelled);

            var dueCount = await baseQuery.CountAsync(
                x => x.Status == InstallmentConstants.PeriodPending
                     && x.DueDate == asOfDate,
                cancellationToken);

            var overdueCount = await baseQuery.CountAsync(
                x => x.Status == InstallmentConstants.PeriodOverdue
                     || (x.Status == InstallmentConstants.PeriodPending && x.DueDate < asOfDate),
                cancellationToken);

            return (dueCount, overdueCount);
        }

        private static PaymentMethodTotal RoundTotal(string method, decimal amount, int count) =>
            new()
            {
                PaymentMethod = method,
                Amount = decimal.Round(amount, 2, MidpointRounding.AwayFromZero),
                PaymentCount = count
            };
    }
}
