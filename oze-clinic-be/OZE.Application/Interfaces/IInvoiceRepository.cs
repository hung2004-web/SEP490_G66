using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IInvoiceRepository
    {
        Task AddAsync(Invoice invoice, CancellationToken cancellationToken = default);

        Task<bool> ExistsByNumberAsync(string invoiceNumber, CancellationToken cancellationToken = default);

        Task<bool> HasOpenInvoiceForAppointmentAsync(long appointmentId, CancellationToken cancellationToken = default);

        Task SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
