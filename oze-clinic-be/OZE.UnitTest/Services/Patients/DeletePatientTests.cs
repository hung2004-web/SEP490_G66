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

        // UTCID02 (N): a patient with an account is soft-deleted and the account is locked
        [Fact]
        public async Task DeletePatientAsync_ShouldLockAccount_WhenPatientHasAccount()
        {
            // Arrange
            var patient = new Patient { Id = 2, PatientCode = "BN-261021-222222", FullName = "Tran Thi B", UserId = "user-2" };
            _patientRepositoryMock
                .Setup(r => r.GetByIdAsync(2, false, false, It.IsAny<CancellationToken>()))
                .ReturnsAsync(patient);

            // Act
            var result = await _patientService.DeletePatientAsync(2);

            // Assert
            result.Success.Should().BeTrue();
            patient.DeletedAt.Should().NotBeNull();
            _patientRepositoryMock.Verify(
                r => r.LockAccountAsync("user-2", It.IsAny<CancellationToken>()),
                Times.Once);
        }

        // UTCID03 (A): an unknown patient id returns PatientNotFound
        [Fact]
        public async Task DeletePatientAsync_ShouldReturnFailure_WhenNotFound()
        {
            // Arrange
            _patientRepositoryMock
                .Setup(r => r.GetByIdAsync(999, false, false, It.IsAny<CancellationToken>()))
                .ReturnsAsync((Patient?)null);

            // Act
            var result = await _patientService.DeletePatientAsync(999);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.PatientMessage.PatientNotFound);
            _patientRepositoryMock.Verify(
                r => r.SaveChangesAsync(It.IsAny<CancellationToken>()),
                Times.Never);
        }

        // UTCID04 (A): a patient with unfinished appointments cannot be deleted
        [Fact]
        public async Task DeletePatientAsync_ShouldReturnFailure_WhenPatientHasOpenAppointments()
        {
            // Arrange
            var patient = new Patient { Id = 3, PatientCode = "BN-261021-333333", FullName = "Le Van C", UserId = "user-3" };
            _patientRepositoryMock
                .Setup(r => r.GetByIdAsync(3, false, false, It.IsAny<CancellationToken>()))
                .ReturnsAsync(patient);
            _patientRepositoryMock
                .Setup(r => r.HasUnfinishedAppointmentsAsync(3, It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);

            // Act
            var result = await _patientService.DeletePatientAsync(3);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.PatientMessage.HasOpenAppointments);
            patient.DeletedAt.Should().BeNull();
            _patientRepositoryMock.Verify(
                r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
            _patientRepositoryMock.Verify(
                r => r.LockAccountAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        }
    }
}
