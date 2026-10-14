using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IServiceRepository
    {
        Task<Service?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
        Task<Service?> GetByCodeAsync(string serviceCode, CancellationToken cancellationToken = default);
        Task<bool> ExistsByCodeAsync(string serviceCode, int? excludeId = null, CancellationToken cancellationToken = default);
        Task<PagedResult<Service>> GetAllAsync(ServiceQueryParameters parameters, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<Service>> GetActiveServicesAsync(CancellationToken cancellationToken = default);
        Task<bool> IsServiceInUseAsync(int serviceId, CancellationToken cancellationToken = default);
        Task AddAsync(Service service, CancellationToken cancellationToken = default);
        Task UpdateAsync(Service service, CancellationToken cancellationToken = default);
        Task DeleteAsync(Service service, CancellationToken cancellationToken = default);
        Task SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
