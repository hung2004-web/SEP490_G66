using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;

namespace OZE.Persistence.Repositories
{
    public class CashSessionRepository : ICashSessionRepository
    {
        private readonly AppIdentityDbContext _context;

        public CashSessionRepository(AppIdentityDbContext context)
        {
            _context = context;
        }

        public Task<CashSession?> GetOpenByUserAsync(string userId, CancellationToken cancellationToken = default)
        {
            return _context.CashSessions
                .Include(x => x.Expenses)
                .FirstOrDefaultAsync(x => x.OpenedByUserId == userId && x.Status == CashSessionConstants.Open, cancellationToken);
        }

        public Task<CashSession?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
        {
            return _context.CashSessions
                .AsNoTracking()
                .Include(x => x.Expenses)
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        }

        public async Task<PagedResult<CashSession>> GetPagedAsync(
            CashSessionQuery query,
            string? openedByUserId,
            CancellationToken cancellationToken = default)
        {
            var sessions = _context.CashSessions.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(openedByUserId))
            {
                sessions = sessions.Where(x => x.OpenedByUserId == openedByUserId);
            }

            var offset = TimeSpan.FromHours(ClinicTimeConstants.UtcOffsetHours);
            if (query.FromDate.HasValue)
            {
                var from = new DateTimeOffset(query.FromDate.Value.ToDateTime(TimeOnly.MinValue), offset);
                sessions = sessions.Where(x => x.OpenedAt >= from);
            }

            if (query.ToDate.HasValue)
            {
                var toExclusive = new DateTimeOffset(query.ToDate.Value.ToDateTime(TimeOnly.MinValue), offset).AddDays(1);
                sessions = sessions.Where(x => x.OpenedAt < toExclusive);
            }

            var totalCount = await sessions.CountAsync(cancellationToken);
            var items = await sessions
                .OrderByDescending(x => x.OpenedAt)
                .Skip((query.PageNumber - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync(cancellationToken);

            return new PagedResult<CashSession>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = query.PageNumber,
                PageSize = query.PageSize
            };
        }

        public async Task AddAsync(CashSession session, CancellationToken cancellationToken = default)
        {
            await _context.CashSessions.AddAsync(session, cancellationToken);
        }

        public void RemoveExpense(CashExpense expense)
        {
            _context.CashExpenses.Remove(expense);
        }

        public Task<List<CashSessionPaymentItem>> GetPaymentsConfirmedByAsync(
            string userId,
            DateTimeOffset from,
            DateTimeOffset to,
            CancellationToken cancellationToken = default)
        {
            return _context.Payments
                .AsNoTracking()
                .Where(x => x.ConfirmedByUserId == userId
                    && x.PaymentStatus == PaymentConstants.Confirmed
                    && x.PaidAt != null
                    && x.PaidAt >= from
                    && x.PaidAt < to)
                .OrderBy(x => x.PaidAt)
                .Select(x => new CashSessionPaymentItem
                {
                    PaymentId = x.Id,
                    InvoiceId = x.InvoiceId,
                    InvoiceNumber = x.Invoice.InvoiceNumber,
                    PatientName = x.Invoice.Patient.FullName,
                    PaymentMethod = x.PaymentMethod,
                    Amount = x.Amount,
                    PaidAt = x.PaidAt
                })
                .ToListAsync(cancellationToken);
        }

        public async Task<Dictionary<string, string>> GetStaffNamesAsync(IEnumerable<string> userIds, CancellationToken cancellationToken = default)
        {
            var ids = userIds.Where(x => !string.IsNullOrWhiteSpace(x)).Distinct().ToList();
            if (ids.Count == 0)
            {
                return new Dictionary<string, string>();
            }

            return await _context.StaffProfiles
                .AsNoTracking()
                .Where(x => ids.Contains(x.UserId))
                .ToDictionaryAsync(x => x.UserId, x => x.FullName, cancellationToken);
        }

        public Task<List<StaffOption>> GetActiveReceptionistsAsync(CancellationToken cancellationToken = default)
        {
            return _context.StaffProfiles
                .AsNoTracking()
                .Where(x => x.IsActive
                    && _context.UserRoles.Any(ur => ur.UserId == x.UserId
                        && _context.Roles.Any(r => r.Id == ur.RoleId && r.Name == RoleConstants.ReceptionistRole)))
                .OrderBy(x => x.FullName)
                .Select(x => new StaffOption { UserId = x.UserId, FullName = x.FullName })
                .ToListAsync(cancellationToken);
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return _context.SaveChangesAsync(cancellationToken);
        }
    }
}
