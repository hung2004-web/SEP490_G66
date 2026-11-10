using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IInvoiceRepository
    {
        Task AddAsync(Invoice invoice, CancellationToken cancellationToken = default);

        void Update(Invoice invoice);

        Task<Invoice?> GetByIdWithDetailsAsync(long id, CancellationToken cancellationToken = default);

        Task<PagedResult<Invoice>> GetPagedAsync(InvoiceQueryParameters parameters, CancellationToken cancellationToken = default);

        Task<IReadOnlyList<Invoice>> GetByPatientAsync(int patientId, CancellationToken cancellationToken = default);

        Task<bool> ExistsByNumberAsync(string invoiceNumber, CancellationToken cancellationToken = default);

        Task<bool> HasOpenInvoiceForAppointmentAsync(long appointmentId, CancellationToken cancellationToken = default);

        Task<bool> HasOpenInvoiceForTreatmentPlanAsync(long treatmentPlanId, CancellationToken cancellationToken = default);

        Task SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
