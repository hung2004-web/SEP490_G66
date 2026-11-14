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
        Task<ApiResponse<ServiceDto>> UpdateServiceAsync(int id, UpdateServiceRequest request, CancellationToken cancellationToken = default);
        Task<ApiResponse<ServiceDto>> ToggleServiceStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default);
        Task<ApiResponse<bool>> DeleteServiceAsync(int id, CancellationToken cancellationToken = default);

        // Service variants (clinic manager)
        Task<ApiResponse<IReadOnlyList<ServiceVariantDto>>> GetVariantsAsync(int serviceId, CancellationToken cancellationToken = default);
        Task<ApiResponse<ServiceVariantDto>> CreateVariantAsync(int serviceId, SaveServiceVariantRequest request, CancellationToken cancellationToken = default);
        Task<ApiResponse<ServiceVariantDto>> UpdateVariantAsync(int serviceId, int variantId, SaveServiceVariantRequest request, CancellationToken cancellationToken = default);
        Task<ApiResponse<ServiceVariantDto>> ToggleVariantStatusAsync(int serviceId, int variantId, bool isActive, CancellationToken cancellationToken = default);
        Task<ApiResponse<bool>> DeleteVariantAsync(int serviceId, int variantId, CancellationToken cancellationToken = default);
    }
}
