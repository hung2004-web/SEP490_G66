using AutoMapper;
using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.MappingProfiles
{
    public class BaseMappingObject : Profile
    {
        public BaseMappingObject()
        {
            CreateMap<UserRefreshToken, UserRefreshTokenDTO>().ReverseMap();
            CreateMap<Service, ServiceDto>().ReverseMap();
            CreateMap<CreateServiceRequest, Service>();
            CreateMap<UpdateServiceRequest, Service>();
            CreateMap<Patient, PatientDto>();
            CreateMap<Patient, PatientDetailDto>()
                .ForMember(dest => dest.TotalAppointments, opt => opt.MapFrom(src => src.Appointments.Count));
            CreateMap<CreatePatientRequest, Patient>();
            CreateMap<UpdatePatientRequest, Patient>();
            CreateMap<PatientMedicalProfile, PatientMedicalProfileDto>();
            CreateMap<CreateMedicalProfileRequest, PatientMedicalProfile>();
        }
    }
}
