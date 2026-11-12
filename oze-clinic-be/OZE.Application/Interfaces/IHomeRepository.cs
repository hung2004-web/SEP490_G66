using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IHomeRepository
    {
        Task<List<Service>> GetActiveServiceAsync(CancellationToken cancellationToken = default);
        Task<List<StaffProfile>> GetActiveDoctorAsync(CancellationToken cancellationToken = default);
        Task<PagedResult<StaffProfile>> GetActiveDoctorsPagedAsync(DoctorQueryParameters parameters, CancellationToken cancellationToken = default);
        Task<StaffProfile?> GetActiveDoctorByIdAsync(int id, CancellationToken cancellationToken = default);
    }
}
