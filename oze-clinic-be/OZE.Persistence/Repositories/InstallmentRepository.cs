using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;

namespace OZE.Persistence.Repositories
{
    public class InstallmentRepository : IInstallmentRepository
    {
        private readonly AppIdentityDbContext _context;

        public InstallmentRepository(AppIdentityDbContext context)
        {
            _context = context;
        }

        public async Task AddPlanAsync(InstallmentPlan plan, CancellationToken cancellationToken = default)
        {
            await _context.InstallmentPlans.AddAsync(plan, cancellationToken);
        }

        public Task<InstallmentPlan?> GetPlanByInvoiceIdAsync(long invoiceId, CancellationToken cancellationToken = default)
        {
            return _context.InstallmentPlans
                .Include(x => x.Periods)
                .Include(x => x.Invoice)
                    .ThenInclude(i => i.Patient)
                .AsSplitQuery()
                .FirstOrDefaultAsync(x => x.InvoiceId == invoiceId, cancellationToken);
        }

        public Task<bool> HasPlanForInvoiceAsync(long invoiceId, CancellationToken cancellationToken = default)
        {
            return _context.InstallmentPlans.AnyAsync(x => x.InvoiceId == invoiceId, cancellationToken);
        }

        public async Task<IReadOnlyList<InstallmentPeriod>> GetDuePeriodsAsync(
            DateOnly asOfDate,
            CancellationToken cancellationToken = default)
        {
            return await _context.InstallmentPeriods
                .AsNoTracking()
                .Include(x => x.InstallmentPlan)
                    .ThenInclude(p => p.Invoice)
                        .ThenInclude(i => i.Patient)
                .Where(x =>
                    (x.Status == InstallmentConstants.PeriodPending
                     || x.Status == InstallmentConstants.PeriodOverdue)
                    && x.DueDate <= asOfDate
                    && x.InstallmentPlan.Invoice.PaymentStatus != InvoiceConstants.Cancelled)
                .OrderBy(x => x.DueDate)
                .ThenBy(x => x.Sequence)
                .AsSplitQuery()
                .ToListAsync(cancellationToken);
        }

        public async Task<int> MarkPendingPastDueAsOverdueAsync(
            DateOnly asOfDate,
            CancellationToken cancellationToken = default)
        {
            var pendingPastDue = await _context.InstallmentPeriods
                .Where(x =>
                    x.Status == InstallmentConstants.PeriodPending
                    && x.DueDate < asOfDate)
                .ToListAsync(cancellationToken);

            foreach (var period in pendingPastDue)
            {
                period.Status = InstallmentConstants.PeriodOverdue;
            }

            if (pendingPastDue.Count > 0)
            {
                await _context.SaveChangesAsync(cancellationToken);
            }

            return pendingPastDue.Count;
        }

        public Task<int> CountOverdueForPatientAsync(
            int patientId,
            DateOnly asOfDate,
            CancellationToken cancellationToken = default)
        {
            return _context.InstallmentPeriods
                .AsNoTracking()
                .CountAsync(
                    x => x.InstallmentPlan.Invoice.PatientId == patientId
                         && x.InstallmentPlan.Invoice.PaymentStatus != InvoiceConstants.Cancelled
                         && x.InstallmentPlan.Invoice.PaymentStatus != InvoiceConstants.Refunded
                         && x.InstallmentPlan.Invoice.PaymentStatus != InvoiceConstants.PartiallyRefunded
                         && (x.Status == InstallmentConstants.PeriodOverdue
                             || (x.Status == InstallmentConstants.PeriodPending && x.DueDate < asOfDate)),
                    cancellationToken);
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return _context.SaveChangesAsync(cancellationToken);
        }
    }
}
