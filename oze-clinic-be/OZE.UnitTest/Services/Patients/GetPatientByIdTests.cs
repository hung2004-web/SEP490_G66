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
    // OZ-PAT-02 GetPatientById
    [Trait("Tab", "OZ-PAT-02")]
    public class GetPatientByIdTests : PatientServiceTestBase
    {
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
    }
}
