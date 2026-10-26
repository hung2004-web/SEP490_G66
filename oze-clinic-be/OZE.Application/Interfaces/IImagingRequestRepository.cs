using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IImagingRequestRepository
    {
        Task<Examination?> GetExaminationAsync(long examinationId, CancellationToken cancellationToken = default);
        Task<List<string>> GetActiveTechnicianUserIdsAsync(CancellationToken cancellationToken = default);
        Task AddAsync(
            ImagingRequest request,
            IReadOnlyCollection<string> technicianUserIds,
            string notificationTitle,
            string notificationMessage,
            CancellationToken cancellationToken = default);
    }
}
