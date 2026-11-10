using AutoMapper;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using OZE.Application.Interfaces;
using OZE.Application.MappingProfiles;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Models.Base;
using OZE.Common.Models;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services.Patients
{
    // OZ-PAT-04 CreatePatient
    [Trait("Tab", "OZ-PAT-04")]
    public class CreatePatientTests : PatientServiceTestBase
    {
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
    }
}
