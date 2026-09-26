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
        }
    }
}
