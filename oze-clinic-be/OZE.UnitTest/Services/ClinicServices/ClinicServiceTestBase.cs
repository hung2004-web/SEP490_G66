using AutoMapper;
using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Moq;
using OZE.Application.Interfaces;
using OZE.Application.MappingProfiles;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services.ClinicServices
{
    // Shared mocks, setup and test data for the ClinicServices tests. Holds no tests itself.
    public abstract class ClinicServiceTestBase
    {
        protected readonly Mock<IServiceRepository> _serviceRepositoryMock;
        protected readonly Mock<ILogger<ClinicServiceService>> _loggerMock;
        protected readonly IMapper _mapper;
        protected readonly IMemoryCache _cache;
        protected readonly ClinicServiceService _service;

        protected ClinicServiceTestBase()
        {
            _serviceRepositoryMock = new Mock<IServiceRepository>();
            _loggerMock = new Mock<ILogger<ClinicServiceService>>();

            var config = new MapperConfiguration(cfg =>
            {
                cfg.AddProfile<BaseMappingObject>();
            });
            _mapper = config.CreateMapper();

            _cache = new MemoryCache(new MemoryCacheOptions());

            _service = new ClinicServiceService(
                _serviceRepositoryMock.Object,
                _mapper,
                _loggerMock.Object,
                _cache);
        }
    }
}
