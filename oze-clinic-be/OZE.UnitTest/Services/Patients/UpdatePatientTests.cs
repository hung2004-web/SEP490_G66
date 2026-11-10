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
    // OZ-PAT-07 UpdatePatient
    [Trait("Tab", "OZ-PAT-07")]
    public class UpdatePatientTests : PatientServiceTestBase
    {
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
    }
}
