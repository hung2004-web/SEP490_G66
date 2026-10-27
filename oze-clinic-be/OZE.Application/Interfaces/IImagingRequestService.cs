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
    }
}
