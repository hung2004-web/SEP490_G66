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

namespace OZE.UnitTest.Services
{
    public class PatientServiceTests
    {
        private readonly Mock<IPatientRepository> _patientRepositoryMock;
        private readonly Mock<ILogger<PatientService>> _loggerMock;
        private readonly IMapper _mapper;
        private readonly PatientService _patientService;

        public PatientServiceTests()
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

        [Fact]
        public async Task GetPatientsAsync_ShouldReturnPagedPatients()
        {
            // Arrange
            var parameters = new PatientQueryParameters { PageNumber = 1, PageSize = 10 };
            var patients = new List<Patient>
            {
                new() { Id = 1, PatientCode = "BN-261021-123456", FullName = "Nguyen Van A" }
            };
            var pagedResult = new PagedResult<Patient>(patients, 1, 1, 10);

            _patientRepositoryMock
                .Setup(r => r.GetAllAsync(parameters, It.IsAny<CancellationToken>()))
                .ReturnsAsync(pagedResult);

            // Act
            var result = await _patientService.GetPatientsAsync(parameters);

            // Assert
            result.Success.Should().BeTrue();
            result.Data.Should().NotBeNull();
            result.Data!.Items.Should().HaveCount(1);
            result.Data.Items[0].FullName.Should().Be("Nguyen Van A");
        }

        [Fact]
        public async Task GetPatientByIdAsync_ShouldReturnPatient_WhenExists()
        {
            // Arrange
            var patient = new Patient
            {
                Id = 1,
                PatientCode = "BN-261021-123456",
                FullName = "Nguyen Van A"
            };

            _patientRepositoryMock
                .Setup(r => r.GetByIdAsync(1, true, true, It.IsAny<CancellationToken>()))
                .ReturnsAsync(patient);

            // Act
            var result = await _patientService.GetPatientByIdAsync(1);

            // Assert
            result.Success.Should().BeTrue();
            result.Data.Should().NotBeNull();
            result.Data!.Id.Should().Be(1);
            result.Data.FullName.Should().Be("Nguyen Van A");
        }

        [Fact]
        public async Task GetPatientByIdAsync_ShouldReturnFailure_WhenNotFound()
        {
            // Arrange
            _patientRepositoryMock
                .Setup(r => r.GetByIdAsync(999, true, true, It.IsAny<CancellationToken>()))
                .ReturnsAsync((Patient?)null);

            // Act
            var result = await _patientService.GetPatientByIdAsync(999);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.PatientMessage.PatientNotFound);
        }

        [Fact]
        public async Task CreatePatientAsync_ShouldCreatePatient_WhenValid()
        {
            // Arrange
            var request = new CreatePatientRequest
            {
                FullName = "Tran Thi C",
                PhoneNumber = "0912345678",
                Gender = "female",
                BloodType = "o+"
            };

            _patientRepositoryMock
                .Setup(r => r.ExistsByPhoneAsync(It.IsAny<string>(), null, It.IsAny<CancellationToken>()))
                .ReturnsAsync(false);

            _patientRepositoryMock
                .Setup(r => r.ExistsByCodeAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(false);

            _patientRepositoryMock
                .Setup(r => r.AddAsync(It.IsAny<Patient>(), It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            _patientRepositoryMock
                .Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            // Act
            var result = await _patientService.CreatePatientAsync(request);

            // Assert
            result.Success.Should().BeTrue();
            result.Data.Should().NotBeNull();
            result.Data!.FullName.Should().Be("Tran Thi C");
            result.Data.Gender.Should().Be("Female"); // normalized
            result.Data.BloodType.Should().Be("O+"); // normalized
            result.Data.PatientCode.Should().StartWith("BN-");

            _patientRepositoryMock.Verify(r => r.AddAsync(It.IsAny<Patient>(), It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task CreatePatientAsync_ShouldFail_WhenInvalidGender()
        {
            // Arrange
            var request = new CreatePatientRequest
            {
                FullName = "Tran Thi C",
                Gender = "InvalidGender"
            };

            // Act
            var result = await _patientService.CreatePatientAsync(request);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.PatientMessage.InvalidGender);
        }

        [Fact]
        public async Task CreatePatientAsync_ShouldFail_WhenDateOfBirthInFuture()
        {
            // Arrange
            var request = new CreatePatientRequest
            {
                FullName = "Tran Thi C",
                DateOfBirth = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(5))
            };

            // Act
            var result = await _patientService.CreatePatientAsync(request);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.PatientMessage.InvalidDateOfBirth);
        }

        [Fact]
        public async Task CreatePatientAsync_ShouldFail_WhenPhoneAlreadyInUse()
        {
            // Arrange
            var request = new CreatePatientRequest
            {
                FullName = "Tran Thi C",
                PhoneNumber = "0912345678"
            };

            _patientRepositoryMock
                .Setup(r => r.ExistsByPhoneAsync(It.IsAny<string>(), null, It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);

            // Act
            var result = await _patientService.CreatePatientAsync(request);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.PatientMessage.PhoneExist);
        }

        [Fact]
        public async Task UpdatePatientAsync_ShouldUpdatePatient_WhenValid()
        {
            // Arrange
            var existingPatient = new Patient
            {
                Id = 1,
                PatientCode = "BN-261021-123456",
                FullName = "Old Name"
            };

            var request = new UpdatePatientRequest
            {
                FullName = "Updated Name",
                Gender = "Male",
                BloodType = "A+"
            };

            _patientRepositoryMock
                .Setup(r => r.GetByIdAsync(1, false, false, It.IsAny<CancellationToken>()))
                .ReturnsAsync(existingPatient);

            _patientRepositoryMock
                .Setup(r => r.UpdateAsync(existingPatient, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            _patientRepositoryMock
                .Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            // Act
            var result = await _patientService.UpdatePatientAsync(1, request);

            // Assert
            result.Success.Should().BeTrue();
            result.Data.Should().NotBeNull();
            result.Data!.FullName.Should().Be("Updated Name");
            result.Data.Gender.Should().Be("Male");
            result.Data.BloodType.Should().Be("A+");
        }

        [Fact]
        public async Task DeletePatientAsync_ShouldSoftDelete_WhenExists()
        {
            // Arrange
            var existingPatient = new Patient
            {
                Id = 1,
                PatientCode = "BN-261021-123456",
                FullName = "Old Name"
            };

            _patientRepositoryMock
                .Setup(r => r.GetByIdAsync(1, false, false, It.IsAny<CancellationToken>()))
                .ReturnsAsync(existingPatient);

            _patientRepositoryMock
                .Setup(r => r.UpdateAsync(existingPatient, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            _patientRepositoryMock
                .Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            // Act
            var result = await _patientService.DeletePatientAsync(1);

            // Assert
            result.Success.Should().BeTrue();
            result.Data.Should().BeTrue();
            existingPatient.DeletedAt.Should().NotBeNull();
        }

        [Fact]
        public async Task AddMedicalProfileAsync_ShouldAddProfile_WhenValid()
        {
            // Arrange
            var existingPatient = new Patient
            {
                Id = 1,
                PatientCode = "BN-261021-123456",
                FullName = "Old Name"
            };

            var request = new CreateMedicalProfileRequest
            {
                RecordType = "allergy",
                Title = "Di ung phan hoa",
                Severity = "moderate",
                Status = "active"
            };

            _patientRepositoryMock
                .Setup(r => r.GetByIdAsync(1, false, false, It.IsAny<CancellationToken>()))
                .ReturnsAsync(existingPatient);

            _patientRepositoryMock
                .Setup(r => r.AddMedicalProfileAsync(It.IsAny<PatientMedicalProfile>(), It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            _patientRepositoryMock
                .Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            // Act
            var result = await _patientService.AddMedicalProfileAsync(1, request, "doctor-1");

            // Assert
            result.Success.Should().BeTrue();
            result.Data.Should().NotBeNull();
            result.Data!.Title.Should().Be("Di ung phan hoa");
            result.Data.RecordType.Should().Be("Allergy"); // normalized
            result.Data.Severity.Should().Be("Moderate"); // normalized
            result.Data.Status.Should().Be("Active");
        }
    }
}
