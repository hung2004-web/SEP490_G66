using AutoMapper;
using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.MappingProfiles
{
    public class BaseMappingObject : Profile
    {
        public BaseMappingObject()
        {
            //auto mapper
            CreateMap<UserRefreshToken, UserRefreshTokenDTO>().ReverseMap();

            CreateMap<Service, ServiceDto>();

            CreateMap<CreateServiceRequest, Service>();
            CreateMap<UpdateServiceRequest, Service>();
        }
    }
}
