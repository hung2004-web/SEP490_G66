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
    // OZ-PAT-03 GetPatientByCode
    [Trait("Tab", "OZ-PAT-03")]
    public class GetPatientByCodeTests : PatientServiceTestBase
    {
        // UTCID01 (N): an existing patient code returns the patient with medical profiles and appointment count
        [Fact]
        public async Task GetPatientByCodeAsync_ShouldReturnPatient_WhenCodeExists()
        {
            // Arrange
            var patient = new Patient
            {
                Id = 1,
                PatientCode = "BN-261021-123456",
                FullName = "Nguyen Van A",
                PhoneNumber = "+84912345678",
                Appointments = new List<Appointment> { new(), new(), new() },
                MedicalProfiles = new List<PatientMedicalProfile> { new() { Id = 5 } }
            };
            _patientRepositoryMock
                .Setup(r => r.GetByCodeAsync("BN-261021-123456", true, It.IsAny<CancellationToken>()))
                .ReturnsAsync(patient);

            // Act
            var result = await _patientService.GetPatientByCodeAsync("BN-261021-123456");

            // Assert
            result.Success.Should().BeTrue();
            result.Data.Should().NotBeNull();
            result.Data!.Id.Should().Be(1);
            result.Data.PatientCode.Should().Be("BN-261021-123456");
            result.Data.FullName.Should().Be("Nguyen Van A");
            result.Data.PhoneNumber.Should().Be("+84912345678");
            result.Data.TotalAppointments.Should().Be(3);
            result.Data.MedicalProfiles.Should().ContainSingle().Which.Id.Should().Be(5);
        }

        // UTCID02 (B): spaces around the code are trimmed before searching
        [Fact]
        public async Task GetPatientByCodeAsync_ShouldTrimCode_WhenCodeHasSpaces()
        {
            // Arrange
            var patient = new Patient { Id = 1, PatientCode = "BN-261021-123456", FullName = "Nguyen Van A" };
            _patientRepositoryMock
                .Setup(r => r.GetByCodeAsync("BN-261021-123456", true, It.IsAny<CancellationToken>()))
                .ReturnsAsync(patient);

            // Act
            var result = await _patientService.GetPatientByCodeAsync("  BN-261021-123456  ");

            // Assert
            result.Success.Should().BeTrue();
            result.Data!.PatientCode.Should().Be("BN-261021-123456");
            _patientRepositoryMock.Verify(
                r => r.GetByCodeAsync("BN-261021-123456", true, It.IsAny<CancellationToken>()), Times.Once);
        }

        // UTCID03 (A): an unknown code returns PatientNotFound
        [Fact]
        public async Task GetPatientByCodeAsync_ShouldReturnFailure_WhenCodeNotFound()
        {
            // Arrange
            _patientRepositoryMock
                .Setup(r => r.GetByCodeAsync("BN-000000-000000", true, It.IsAny<CancellationToken>()))
                .ReturnsAsync((Patient?)null);

            // Act
            var result = await _patientService.GetPatientByCodeAsync("BN-000000-000000");

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.PatientMessage.PatientNotFound);
            result.Data.Should().BeNull();
        }

        // UTCID04 (A): an empty code is rejected without querying the database
        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public async Task GetPatientByCodeAsync_ShouldReturnFailure_WhenCodeIsEmpty(string code)
        {
            // Act
            var result = await _patientService.GetPatientByCodeAsync(code);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.PatientMessage.PatientNotFound);
            _patientRepositoryMock.Verify(
                r => r.GetByCodeAsync(It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Never);
        }
    }
}
