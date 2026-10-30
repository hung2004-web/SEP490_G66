using OZE.Application.Interfaces;
using OZE.Common.Models;
using OZE.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Numerics;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Application.Services
{
    public class HomeService : IHomeService
    {
        private readonly IHomeRepository repo;
        public HomeService(IHomeRepository _repo)
        {
            repo = _repo;
        }
        public async Task<HomePageResponse> GetHomePageAsync()
        {
            var services = await repo.GetActiveServiceAsync();
            var doctors = await repo.GetActiveDoctorAsync();
            return new HomePageResponse
            {
                Services = services.Select(ToServiceResponse).ToList(),
                Doctors = doctors.Select(ToDoctorResponse).ToList()
            };
        }

        private static HomeDoctorResponse ToDoctorResponse(StaffProfile doctor)
        {
            return new HomeDoctorResponse
            {
                Id = doctor.Id,
                FullName = doctor.FullName,
                Specialization = doctor.Specialization
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
        private static HomeServiceResponse CheckToServiceResponse(Service service)
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
