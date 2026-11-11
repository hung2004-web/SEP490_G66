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

        // UTCID02 (A): an unknown patient id returns PatientNotFound
        [Fact]
        public async Task AddMedicalProfileAsync_ShouldReturnFailure_WhenPatientNotFound()
        {
            // Arrange
            _patientRepositoryMock
                .Setup(r => r.GetByIdAsync(999, false, false, It.IsAny<CancellationToken>()))
                .ReturnsAsync((Patient?)null);

            // Act
            var result = await _patientService.AddMedicalProfileAsync(999, ValidRequest(), "doctor-1");

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.PatientMessage.PatientNotFound);
            VerifyNothingSaved();
        }

        // UTCID03 (A): a record type outside History/Condition/Allergy/Medication is rejected
        [Fact]
        public async Task AddMedicalProfileAsync_ShouldReturnFailure_WhenRecordTypeIsInvalid()
        {
            // Arrange
            ArrangePatient();
            var request = ValidRequest();
            request.RecordType = "Surgery";

            // Act
            var result = await _patientService.AddMedicalProfileAsync(1, request, "doctor-1");

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.PatientMessage.InvalidRecordType);
            VerifyNothingSaved();
        }

        // UTCID04 (A): a severity outside Mild/Moderate/Severe is rejected
        [Fact]
        public async Task AddMedicalProfileAsync_ShouldReturnFailure_WhenSeverityIsInvalid()
        {
            // Arrange
            ArrangePatient();
            var request = ValidRequest();
            request.Severity = "Critical";

            // Act
            var result = await _patientService.AddMedicalProfileAsync(1, request, "doctor-1");

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.PatientMessage.InvalidSeverity);
            VerifyNothingSaved();
        }

        // UTCID05 (A): a status outside Active/Resolved/Discontinued is rejected
        [Fact]
        public async Task AddMedicalProfileAsync_ShouldReturnFailure_WhenStatusIsInvalid()
        {
            // Arrange
            ArrangePatient();
            var request = ValidRequest();
            request.Status = "Pending";

            // Act
            var result = await _patientService.AddMedicalProfileAsync(1, request, "doctor-1");

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.PatientMessage.InvalidStatus);
            VerifyNothingSaved();
        }

        // UTCID06 (B): an empty severity and status are allowed; status defaults to Active
        [Fact]
        public async Task AddMedicalProfileAsync_ShouldUseDefaults_WhenSeverityAndStatusAreEmpty()
        {
            // Arrange
            ArrangePatient();
            var request = ValidRequest();
            request.Severity = null;
            request.Status = "";

            // Act
            var result = await _patientService.AddMedicalProfileAsync(1, request, "doctor-1");

            // Assert
            result.Success.Should().BeTrue();
            result.Data!.Severity.Should().BeNull();
            result.Data.Status.Should().Be("Active");
        }

        // UTCID07 (N): the saved record belongs to the patient, has a trimmed title and remembers who added it
        [Fact]
        public async Task AddMedicalProfileAsync_ShouldSaveProfileForPatient()
        {
            // Arrange
            ArrangePatient();
            PatientMedicalProfile? saved = null;
            _patientRepositoryMock
                .Setup(r => r.AddMedicalProfileAsync(It.IsAny<PatientMedicalProfile>(), It.IsAny<CancellationToken>()))
                .Callback<PatientMedicalProfile, CancellationToken>((p, _) => saved = p)
                .Returns(Task.CompletedTask);
            var request = ValidRequest();
            request.Title = "  Tieu duong type 2  ";
            request.RecordType = "condition";

            // Act
            var result = await _patientService.AddMedicalProfileAsync(1, request, "doctor-1");

            // Assert
            result.Success.Should().BeTrue();
            saved.Should().NotBeNull();
            saved!.PatientId.Should().Be(1);
            saved.Title.Should().Be("Tieu duong type 2");
            saved.RecordType.Should().Be("Condition");
            saved.CreatedByUserId.Should().Be("doctor-1");
            _patientRepositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        // ===== Shared test data =====

        // Patient id 1 exists in the database
        private void ArrangePatient()
        {
            _patientRepositoryMock
                .Setup(r => r.GetByIdAsync(1, false, false, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new Patient { Id = 1, PatientCode = "BN-261021-123456", FullName = "Nguyen Van A" });
        }

        // A valid request; each test changes only the field it checks
        private static CreateMedicalProfileRequest ValidRequest() => new()
        {
            RecordType = "Allergy",
            Title = "Di ung Penicillin",
            Severity = "Severe",
            Status = "Active"
        };

        // Nothing was written to the database
        private void VerifyNothingSaved()
        {
            _patientRepositoryMock.Verify(r => r.AddMedicalProfileAsync(It.IsAny<PatientMedicalProfile>(), It.IsAny<CancellationToken>()), Times.Never);
            _patientRepositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        }
    }
}
