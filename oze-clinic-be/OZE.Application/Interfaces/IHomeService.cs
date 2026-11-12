using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Application.Interfaces
{
    public interface IHomeService
    {
        Task<HomePageResponse> GetHomePageAsync(CancellationToken cancellationToken = default);
        Task<PagedResult<HomeDoctorResponse>> GetDoctorsAsync(DoctorQueryParameters parameters, CancellationToken cancellationToken = default);
        Task<HomeDoctorResponse?> GetDoctorByIdAsync(int id, CancellationToken cancellationToken = default);
    }
}
