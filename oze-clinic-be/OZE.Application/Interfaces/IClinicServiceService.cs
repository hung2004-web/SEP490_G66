using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Application.Interfaces
{
    public interface IClinicServiceService
    {
        Task<ApiResponse<PagedResult<ServiceDto>>> GetServicesAsync(ServiceQueryParameters parameters, CancellationToken cancellationToken = default);
        Task<ApiResponse<IReadOnlyList<ServiceDto>>> GetActiveServicesAsync(CancellationToken cancellationToken = default);
        Task<ApiResponse<ServiceDto>> GetServiceByIdAsync(int id, CancellationToken cancellationToken = default);
        Task<ApiResponse<ServiceDto>> GetServiceByCodeAsync(string code, CancellationToken cancellationToken = default);
        Task<ApiResponse<ServiceDto>> CreateServiceAsync(CreateServiceRequest request, CancellationToken cancellationToken = default);
    }
}
