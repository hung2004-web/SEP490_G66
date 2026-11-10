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
    // OZ-PAT-05 DeletePatient
    [Trait("Tab", "OZ-PAT-05")]
    public class DeletePatientTests : PatientServiceTestBase
    {
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
    }
}
