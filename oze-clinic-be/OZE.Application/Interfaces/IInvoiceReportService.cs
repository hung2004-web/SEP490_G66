using OZE.Common.Models;

namespace OZE.Application.Interfaces
{
    public interface IInvoiceReportService
    {
        Task<InvoiceReportResponse> GetDailyAsync(
            DailyInvoiceReportQuery query,
            CancellationToken cancellationToken = default);

        Task<InvoiceReportResponse> GetOverviewAsync(
            OverviewInvoiceReportQuery query,
            CancellationToken cancellationToken = default);
    }
}
