using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;

namespace OZE.Persistence.Repositories
{
    public class CareRepository : ICareRepository
    {
        private static readonly string[] OpenInvoiceStatuses =
        {
            InvoiceConstants.Unpaid,
            InvoiceConstants.PartiallyPaid,
            InvoiceConstants.PendingConfirmation
        };

        private readonly AppIdentityDbContext _context;

        public CareRepository(AppIdentityDbContext context)
        {
            _context = context;
        }

        public Task<Examination?> GetExaminationForContactAsync(long examinationId, CancellationToken cancellationToken = default)
        {
            return _context.Examinations
                .Include(x => x.FollowUpContacts)
                .FirstOrDefaultAsync(x => x.Id == examinationId, cancellationToken);
        }

        public Task<List<FollowUpContact>> GetContactsAsync(long examinationId, CancellationToken cancellationToken = default)
        {
            return _context.FollowUpContacts
                .AsNoTracking()
                .Where(x => x.ExaminationId == examinationId)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync(cancellationToken);
        }

        public Task<List<Invoice>> GetOpenInvoicesAsync(string? keyword, CancellationToken cancellationToken = default)
        {
            var query = _context.Invoices
                .AsNoTracking()
                .Include(x => x.Patient)
                .Include(x => x.InstallmentPlans).ThenInclude(x => x.Periods)
                .Where(x => OpenInvoiceStatuses.Contains(x.PaymentStatus) && x.FinalAmount > x.PaidAmount);

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var k = keyword.Trim();
                query = query.Where(x => x.InvoiceNumber.Contains(k)
                    || x.Patient.FullName.Contains(k)
                    || x.Patient.PatientCode.Contains(k)
                    || (x.Patient.PhoneNumber != null && x.Patient.PhoneNumber.Contains(k)));
            }

            return query.ToListAsync(cancellationToken);
        }

        public Task<Invoice?> GetInvoiceWithPatientAsync(long invoiceId, CancellationToken cancellationToken = default)
        {
            return _context.Invoices
                .AsNoTracking()
                .Include(x => x.Patient)
                .Include(x => x.InstallmentPlans).ThenInclude(x => x.Periods)
                .FirstOrDefaultAsync(x => x.Id == invoiceId, cancellationToken);
        }

        public async Task<Dictionary<long, (int Count, DateTimeOffset Last)>> GetReminderStatsAsync(
            IEnumerable<long> invoiceIds,
            CancellationToken cancellationToken = default)
        {
            var ids = invoiceIds.Distinct().ToList();
            var rows = await _context.PaymentReminders
                .AsNoTracking()
                .Where(x => ids.Contains(x.InvoiceId))
                .GroupBy(x => x.InvoiceId)
                .Select(g => new { InvoiceId = g.Key, Count = g.Count(), Last = g.Max(x => x.SentAt) })
                .ToListAsync(cancellationToken);
            return rows.ToDictionary(x => x.InvoiceId, x => (x.Count, x.Last));
        }

        public Task<List<PaymentReminder>> GetRemindersAsync(long invoiceId, CancellationToken cancellationToken = default)
        {
            return _context.PaymentReminders
                .AsNoTracking()
                .Where(x => x.InvoiceId == invoiceId)
                .OrderByDescending(x => x.SentAt)
                .ToListAsync(cancellationToken);
        }

        public async Task AddReminderAsync(PaymentReminder reminder, CancellationToken cancellationToken = default)
        {
            await _context.PaymentReminders.AddAsync(reminder, cancellationToken);
        }

        public Task<List<InstallmentPeriod>> GetPeriodsToRemindAsync(DateOnly targetDate, DateOnly today, CancellationToken cancellationToken = default)
        {
            return _context.InstallmentPeriods
                .AsNoTracking()
                .Include(x => x.InstallmentPlan).ThenInclude(x => x.Invoice).ThenInclude(x => x.Patient)
                .Where(x => OpenInvoiceStatuses.Contains(x.InstallmentPlan.Invoice.PaymentStatus)
                    && ((x.Status == InstallmentConstants.PeriodPending && x.DueDate == targetDate)
                        || ((x.Status == InstallmentConstants.PeriodPending || x.Status == InstallmentConstants.PeriodOverdue) && x.DueDate < today)))
                .OrderBy(x => x.DueDate)
                .ToListAsync(cancellationToken);
        }

        public async Task<Dictionary<long, DateTimeOffset>> GetLastReminderByPeriodAsync(IEnumerable<long> periodIds, CancellationToken cancellationToken = default)
        {
            var ids = periodIds.Distinct().ToList();
            var rows = await _context.PaymentReminders
                .AsNoTracking()
                .Where(x => x.InstallmentPeriodId != null && ids.Contains(x.InstallmentPeriodId.Value))
                .GroupBy(x => x.InstallmentPeriodId!.Value)
                .Select(g => new { PeriodId = g.Key, Last = g.Max(x => x.SentAt) })
                .ToListAsync(cancellationToken);
            return rows.ToDictionary(x => x.PeriodId, x => x.Last);
        }

        public Task<List<CashSession>> GetSessionsOpenedBetweenAsync(DateTimeOffset from, DateTimeOffset to, CancellationToken cancellationToken = default)
        {
            return _context.CashSessions
                .AsNoTracking()
                .Where(x => x.OpenedAt >= from && x.OpenedAt < to)
                .OrderBy(x => x.OpenedAt)
                .ToListAsync(cancellationToken);
        }

        public Task<List<ConfirmedPaymentRow>> GetConfirmedPaymentsBetweenAsync(DateTimeOffset from, DateTimeOffset to, CancellationToken cancellationToken = default)
        {
            return _context.Payments
                .AsNoTracking()
                .Where(x => x.PaymentStatus == PaymentConstants.Confirmed && x.PaidAt != null && x.PaidAt >= from && x.PaidAt < to)
                .Select(x => new ConfirmedPaymentRow { PaymentMethod = x.PaymentMethod, Amount = x.Amount, PaidAt = x.PaidAt!.Value })
                .ToListAsync(cancellationToken);
        }

        public Task<List<PendingTransferItem>> GetPendingTransfersBeforeAsync(DateTimeOffset to, CancellationToken cancellationToken = default)
        {
            return _context.Payments
                .AsNoTracking()
                .Where(x => x.PaymentStatus == PaymentConstants.Pending && x.CreatedAt < to)
                .OrderBy(x => x.CreatedAt)
                .Select(x => new PendingTransferItem
                {
                    PaymentId = x.Id,
                    InvoiceId = x.InvoiceId,
                    InvoiceNumber = x.Invoice.InvoiceNumber,
                    PatientName = x.Invoice.Patient.FullName,
                    PaymentMethod = x.PaymentMethod,
                    Amount = x.Amount,
                    TransactionReference = x.TransactionReference,
                    CreatedAt = x.CreatedAt
                })
                .ToListAsync(cancellationToken);
        }

        public Task<List<RefundOfDayItem>> GetRefundsProcessedBetweenAsync(DateTimeOffset from, DateTimeOffset to, CancellationToken cancellationToken = default)
        {
            return _context.RefundAdjustmentRequests
                .AsNoTracking()
                .Where(x => x.Status == "Processed" && x.ProcessedAt != null && x.ProcessedAt >= from && x.ProcessedAt < to)
                .Select(x => new RefundOfDayItem
                {
                    Id = x.Id,
                    InvoiceNumber = x.Invoice.InvoiceNumber,
                    PatientName = x.Invoice.Patient.FullName,
                    // Money given back = requested amount minus the work already done
                    Amount = x.Amount - (x.WorkDoneAmount ?? 0m),
                    ProcessedAt = x.ProcessedAt
                })
                .ToListAsync(cancellationToken);
        }

        public Task<DailyReconciliation?> GetReconciliationAsync(DateOnly date, CancellationToken cancellationToken = default)
        {
            return _context.DailyReconciliations.AsNoTracking().FirstOrDefaultAsync(x => x.ClinicDate == date, cancellationToken);
        }

        public async Task AddReconciliationAsync(DailyReconciliation reconciliation, CancellationToken cancellationToken = default)
        {
            await _context.DailyReconciliations.AddAsync(reconciliation, cancellationToken);
        }

        public async Task<(List<PaymentHistoryItem> Items, int Total, decimal Cash, decimal Transfer, decimal Pending)> GetPaymentHistoryAsync(
            PaymentHistoryQuery query, CancellationToken cancellationToken = default)
        {
            var offset = TimeSpan.FromHours(ClinicTimeConstants.UtcOffsetHours);
            var payments = _context.Payments.AsNoTracking().AsQueryable();

            if (query.FromDate.HasValue)
            {
                var from = new DateTimeOffset(query.FromDate.Value.ToDateTime(TimeOnly.MinValue), offset);
                payments = payments.Where(x => (x.PaidAt ?? x.CreatedAt) >= from);
            }

            if (query.ToDate.HasValue)
            {
                var to = new DateTimeOffset(query.ToDate.Value.ToDateTime(TimeOnly.MinValue), offset).AddDays(1);
                payments = payments.Where(x => (x.PaidAt ?? x.CreatedAt) < to);
            }

            if (!string.IsNullOrWhiteSpace(query.PaymentMethod))
            {
                var method = query.PaymentMethod.Trim().ToUpperInvariant();
                payments = payments.Where(x => x.PaymentMethod == method);
            }

            if (!string.IsNullOrWhiteSpace(query.PaymentStatus))
            {
                var status = query.PaymentStatus.Trim().ToUpperInvariant();
                payments = payments.Where(x => x.PaymentStatus == status);
            }

            if (!string.IsNullOrWhiteSpace(query.SearchKeyword))
            {
                var k = query.SearchKeyword.Trim();
                payments = payments.Where(x => x.Invoice.InvoiceNumber.Contains(k)
                    || x.Invoice.Patient.FullName.Contains(k)
                    || x.Invoice.Patient.PatientCode.Contains(k)
                    || (x.Invoice.Patient.PhoneNumber != null && x.Invoice.Patient.PhoneNumber.Contains(k))
                    || (x.TransactionReference != null && x.TransactionReference.Contains(k)));
            }

            var total = await payments.CountAsync(cancellationToken);
            var cash = await payments.Where(x => x.PaymentStatus == PaymentConstants.Confirmed && x.PaymentMethod == PaymentConstants.Cash)
                .SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m;
            var transfer = await payments.Where(x => x.PaymentStatus == PaymentConstants.Confirmed && x.PaymentMethod != PaymentConstants.Cash)
                .SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m;
            var pending = await payments.Where(x => x.PaymentStatus == PaymentConstants.Pending)
                .SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m;

            var items = await payments
                .OrderByDescending(x => x.PaidAt ?? x.CreatedAt)
                .Skip((query.PageNumber - 1) * query.PageSize)
                .Take(query.PageSize)
                .Select(x => new PaymentHistoryItem
                {
                    Id = x.Id,
                    InvoiceId = x.InvoiceId,
                    InvoiceNumber = x.Invoice.InvoiceNumber,
                    PatientName = x.Invoice.Patient.FullName,
                    PatientCode = x.Invoice.Patient.PatientCode,
                    Amount = x.Amount,
                    PaymentMethod = x.PaymentMethod,
                    PaymentStatus = x.PaymentStatus,
                    Purpose = x.Purpose,
                    TransactionReference = x.TransactionReference,
                    CreatedAt = x.CreatedAt,
                    PaidAt = x.PaidAt,
                    ConfirmedByUserId = x.ConfirmedByUserId
                })
                .ToListAsync(cancellationToken);

            return (items, total, cash, transfer, pending);
        }

        public async Task<Dictionary<string, string>> GetStaffNamesAsync(IEnumerable<string?> userIds, CancellationToken cancellationToken = default)
        {
            var ids = userIds.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x!).Distinct().ToList();
            if (ids.Count == 0)
            {
                return new Dictionary<string, string>();
            }

            return await _context.StaffProfiles
                .AsNoTracking()
                .Where(x => ids.Contains(x.UserId))
                .ToDictionaryAsync(x => x.UserId, x => x.FullName, cancellationToken);
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken = default) => _context.SaveChangesAsync(cancellationToken);
    }
}
