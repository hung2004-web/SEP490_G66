using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;

namespace OZE.Persistence.Repositories
{
    public class InvoiceRepository : IInvoiceRepository
    {
        private readonly AppIdentityDbContext _context;

        public InvoiceRepository(AppIdentityDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(Invoice invoice, CancellationToken cancellationToken = default)
        {
            await _context.Invoices.AddAsync(invoice, cancellationToken);
        }

        public void Update(Invoice invoice)
        {
            _context.Invoices.Update(invoice);
        }

        public async Task<Invoice?> GetByIdWithDetailsAsync(long id, CancellationToken cancellationToken = default)
        {
            var invoice = await _context.Invoices
                .Include(x => x.Items)
                .Include(x => x.Payments)
                .Include(x => x.RefundAdjustmentRequests)
                .Include(x => x.InstallmentPlans)
                    .ThenInclude(x => x.Periods)
                .Include(x => x.Patient)
                .AsSplitQuery()
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

            if (invoice is not null)
            {
                invoice.Items = invoice.Items
                    .OrderBy(x => x.SortOrder)
                    .ToList();
            }

            return invoice;
        }

        public async Task<PagedResult<Invoice>> GetPagedAsync(
            InvoiceQueryParameters parameters,
            CancellationToken cancellationToken = default)
        {
            var query = _context.Invoices
                .AsNoTracking()
                .Include(x => x.Patient)
                .AsQueryable();

            if (parameters.PatientId.HasValue)
            {
                query = query.Where(x => x.PatientId == parameters.PatientId.Value);
            }

            if (parameters.AppointmentId.HasValue)
            {
                query = query.Where(x => x.AppointmentId == parameters.AppointmentId.Value);
            }

            if (parameters.TreatmentPlanId.HasValue)
            {
                query = query.Where(x => x.TreatmentPlanId == parameters.TreatmentPlanId.Value);
            }

            if (!string.IsNullOrWhiteSpace(parameters.PaymentStatus))
            {
                var status = parameters.PaymentStatus.Trim().ToUpperInvariant();
                query = query.Where(x => x.PaymentStatus == status);
            }

            if (!string.IsNullOrWhiteSpace(parameters.SearchKeyword))
            {
                var keyword = parameters.SearchKeyword.Trim();
                query = query.Where(x => x.InvoiceNumber.Contains(keyword)
                    || (x.Notes != null && x.Notes.Contains(keyword))
                    || (x.Patient != null && x.Patient.FullName.Contains(keyword)));
            }

            var totalCount = await query.CountAsync(cancellationToken);
            if (totalCount == 0)
            {
                return new PagedResult<Invoice>(new List<Invoice>(), 0, parameters.PageNumber, parameters.PageSize);
            }

            // Default CreatedAt desc — khớp GetByPatientAsync
            query = parameters.SortBy?.Trim().ToLowerInvariant() switch
            {
                "invoicenumber" => parameters.SortDescending
                    ? query.OrderByDescending(x => x.InvoiceNumber)
                    : query.OrderBy(x => x.InvoiceNumber),
                "finalamount" => parameters.SortDescending
                    ? query.OrderByDescending(x => x.FinalAmount)
                    : query.OrderBy(x => x.FinalAmount),
                "paymentstatus" => parameters.SortDescending
                    ? query.OrderByDescending(x => x.PaymentStatus)
                    : query.OrderBy(x => x.PaymentStatus),
                "id" => parameters.SortDescending
                    ? query.OrderByDescending(x => x.Id)
                    : query.OrderBy(x => x.Id),
                "createdat" => parameters.SortDescending
                    ? query.OrderByDescending(x => x.CreatedAt)
                    : query.OrderBy(x => x.CreatedAt),
                _ => parameters.SortDescending
                    ? query.OrderBy(x => x.CreatedAt)
                    : query.OrderByDescending(x => x.CreatedAt)
            };

            var items = await query
                .Skip((parameters.PageNumber - 1) * parameters.PageSize)
                .Take(parameters.PageSize)
                .ToListAsync(cancellationToken);

            return new PagedResult<Invoice>(items, totalCount, parameters.PageNumber, parameters.PageSize);
        }

        public async Task<IReadOnlyList<Invoice>> GetByPatientAsync(
            int patientId,
            CancellationToken cancellationToken = default)
        {
            return await _context.Invoices
                .AsNoTracking()
                .Where(x => x.PatientId == patientId)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync(cancellationToken);
        }

        public Task<bool> ExistsByNumberAsync(string invoiceNumber, CancellationToken cancellationToken = default)
        {
            return _context.Invoices.AnyAsync(x => x.InvoiceNumber == invoiceNumber, cancellationToken);
        }

        public Task<bool> HasOpenInvoiceForAppointmentAsync(long appointmentId, CancellationToken cancellationToken = default)
        {
            return _context.Invoices.AnyAsync(
                x => x.AppointmentId == appointmentId
                     && InvoiceConstants.OpenStatuses.Contains(x.PaymentStatus),
                cancellationToken);
        }

        public Task<bool> HasOpenInvoiceForTreatmentPlanAsync(
            long treatmentPlanId,
            CancellationToken cancellationToken = default)
        {
            return _context.Invoices.AnyAsync(
                x => x.TreatmentPlanId == treatmentPlanId
                     && InvoiceConstants.OpenStatuses.Contains(x.PaymentStatus),
                cancellationToken);
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return _context.SaveChangesAsync(cancellationToken);
        }
    }
}
