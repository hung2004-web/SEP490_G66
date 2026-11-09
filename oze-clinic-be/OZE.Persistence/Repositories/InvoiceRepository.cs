using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
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

        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return _context.SaveChangesAsync(cancellationToken);
        }
    }
}
