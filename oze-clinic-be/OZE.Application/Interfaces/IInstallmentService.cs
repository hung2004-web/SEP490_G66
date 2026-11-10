using OZE.Common.Models;

namespace OZE.Application.Interfaces
{
    public interface IInstallmentService
    {
        Task<InstallmentPlanResponse> CreatePlanAsync(
            long invoiceId,
            string createdByUserId,
            CreateInstallmentPlanRequest request,
            CancellationToken cancellationToken = default);

        Task<InstallmentPlanResponse> GetPlanByInvoiceAsync(
            long invoiceId,
            string? ownerUserId,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<InstallmentPeriodResponse>> GetDuePeriodsAsync(
            CancellationToken cancellationToken = default);
    }
}
