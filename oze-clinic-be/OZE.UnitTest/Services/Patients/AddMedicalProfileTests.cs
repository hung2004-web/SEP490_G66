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
    // OZ-PAT-06 AddMedicalProfile
    [Trait("Tab", "OZ-PAT-06")]
    public class AddMedicalProfileTests : PatientServiceTestBase
    {
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
