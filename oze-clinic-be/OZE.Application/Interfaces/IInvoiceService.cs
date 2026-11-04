using OZE.Common.Models;

namespace OZE.Application.Interfaces
{
    public interface IInvoiceService
    {
        Task<InvoiceResponse> CreateAsync(
            string createdByUserId,
            CreateInvoiceRequest request,
            CancellationToken cancellationToken = default);
    }
}
