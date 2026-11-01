using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IImagingRequestRepository
    {
        Task<Examination?> GetExaminationAsync(long examinationId, CancellationToken cancellationToken = default);
        Task<List<ImagingRequest>> GetByExaminationIdAsync(long examinationId, CancellationToken cancellationToken = default);
        Task<ImagingRequest?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
        Task<ImagingRequest?> GetTrackedByIdAsync(long id, CancellationToken cancellationToken = default);
        Task<List<ImagingRequest>> GetQueueAsync(CancellationToken cancellationToken = default);
        Task SaveChangesAsync(CancellationToken cancellationToken = default);
        Task<List<string>> GetActiveTechnicianUserIdsAsync(CancellationToken cancellationToken = default);
        Task AddAsync(
            ImagingRequest request,
            IReadOnlyCollection<string> technicianUserIds,
            string notificationTitle,
            string notificationMessage,
            CancellationToken cancellationToken = default);
    }
}
