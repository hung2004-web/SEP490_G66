using AutoMapper;
using FluentAssertions;
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

namespace OZE.UnitTest.Services.Patients
{
    // Shared mocks, setup and test data for the Patients tests. Holds no tests itself.
    public abstract class PatientServiceTestBase
    {
        protected readonly Mock<IPatientRepository> _patientRepositoryMock;
        protected readonly Mock<ILogger<PatientService>> _loggerMock;
        protected readonly IMapper _mapper;
        protected readonly PatientService _patientService;

        protected PatientServiceTestBase()
        {
            _patientRepositoryMock = new Mock<IPatientRepository>();
            _loggerMock = new Mock<ILogger<PatientService>>();

            var config = new MapperConfiguration(cfg =>
            {
                cfg.AddProfile<BaseMappingObject>();
            });
            _mapper = config.CreateMapper();

            _patientService = new PatientService(
                _patientRepositoryMock.Object,
                _mapper,
                _loggerMock.Object);
        }
    }
}
