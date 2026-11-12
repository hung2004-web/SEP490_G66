using OZE.Application.Interfaces;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;

namespace OZE.Application.Services
{
    public class HomeService : IHomeService
    {
        private readonly IHomeRepository _repo;

        public HomeService(IHomeRepository repo)
        {
            _repo = repo;
        }

        public async Task<HomePageResponse> GetHomePageAsync(CancellationToken cancellationToken = default)
        {
            var services = await _repo.GetActiveServiceAsync(cancellationToken);
            var doctors = await _repo.GetActiveDoctorAsync(cancellationToken);

            return new HomePageResponse
            {
                Services = services.Select(ToServiceResponse).ToList(),
                Doctors = doctors.Select(ToDoctorResponse).ToList()
            };
        }

        public async Task<PagedResult<HomeDoctorResponse>> GetDoctorsAsync(DoctorQueryParameters parameters, CancellationToken cancellationToken = default)
        {
            var pagedDoctors = await _repo.GetActiveDoctorsPagedAsync(parameters, cancellationToken);
            var mappedItems = pagedDoctors.Items.Select(ToDoctorResponse).ToList();

            return new PagedResult<HomeDoctorResponse>(
                mappedItems,
                pagedDoctors.TotalCount,
                pagedDoctors.PageNumber,
                pagedDoctors.PageSize);
        }

        public async Task<HomeDoctorResponse?> GetDoctorByIdAsync(int id, CancellationToken cancellationToken = default)
        {
            var doctor = await _repo.GetActiveDoctorByIdAsync(id, cancellationToken);
            return doctor != null ? ToDoctorResponse(doctor) : null;
        }

        private static HomeDoctorResponse ToDoctorResponse(StaffProfile doctor)
        {
            return new HomeDoctorResponse
            {
                Id = doctor.Id,
                FullName = doctor.FullName,
                Specialization = doctor.Specialization,
                LicenseNumber = doctor.LicenseNumber,
                PhoneNumber = doctor.PhoneNumber,
                Gender = doctor.Gender,
                DateOfBirth = doctor.DateOfBirth,
                HireDate = doctor.HireDate,
                IsActive = doctor.IsActive
            };
        }

        private static HomeServiceResponse ToServiceResponse(Service service)
        {
            return new HomeServiceResponse
            {
                Id = service.Id,
                ServiceName = service.ServiceName,
                Description = service.Description,
                ReferencePrice = service.ReferencePrice,
                EstimatedMinutes = service.EstimatedMinutes
            };
        }
    }
}
