using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Application.Interfaces
{
    public interface IInvoiceService
    {
        Task<InvoiceResponse> CreateAsync(
            string createdByUserId,
            CreateInvoiceRequest request,
            CancellationToken cancellationToken = default);

        Task<InvoiceResponse> GetByIdAsync(
            long id,
            string? ownerUserId,
            CancellationToken cancellationToken = default);

        Task<PagedResult<InvoiceSummaryResponse>> GetPagedAsync(
            InvoiceQueryParameters parameters,
            CancellationToken cancellationToken = default);

        Task<PagedResult<InvoiceSummaryResponse>> GetMyInvoicesAsync(
            InvoiceQueryParameters parameters,
            string userId,
            CancellationToken cancellationToken = default);

        Task<InvoiceResponse> UpdateAsync(
            long id,
            string updatedByUserId,
            UpdateInvoiceRequest request,
            CancellationToken cancellationToken = default);

        Task<InvoiceResponse> CancelAsync(
            long id,
            string cancelledByUserId,
            CancellationToken cancellationToken = default);
    }
}
