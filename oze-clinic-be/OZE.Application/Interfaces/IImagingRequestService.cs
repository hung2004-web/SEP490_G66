using OZE.Common.Models;

namespace OZE.Application.Interfaces
{
    public interface IImagingRequestService
    {
        Task<ImagingRequestResponse> CreateAsync(
            string userId,
            long examinationId,
            CreateImagingRequest request,
            CancellationToken cancellationToken = default);

        Task<List<ImagingRequestResponse>> GetByExaminationAsync(
            string userId,
            long examinationId,
            CancellationToken cancellationToken = default);

        Task<ImagingRequestResponse> GetByIdAsync(
            string userId,
            long id,
            CancellationToken cancellationToken = default);

        Task<ImagingRequestResponse> CancelAsync(
            string userId,
            long id,
            CancelImagingRequest request,
            CancellationToken cancellationToken = default);

        Task<List<ImagingRequestQueueResponse>> GetQueueAsync(CancellationToken cancellationToken = default);

        Task<ImagingRequestResponse> CompleteAsync(
            long id,
            string? technicianUserId = null,
            string? notes = null,
            CancellationToken cancellationToken = default);

        Task<bool> ProcessSimulatorWebhookAsync(
            ImagingSimulatorWebhookPayload payload,
            CancellationToken cancellationToken = default);
    }
}
