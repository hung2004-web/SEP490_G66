using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Threading;
using System;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services.Appointments
{
    // OZ-APPT-19 CompleteExamination
    [Trait("Tab", "OZ-APPT-19")]
    public class CompleteExaminationTests : AppointmentQueueTestBase
    {
        [Fact]
        public async Task CompleteExaminationAsync_ShouldLockExaminationAndCompleteAppointment()
        {
            // Arrange
            var examination = new Examination
            {
                Id = 88,
                AppointmentId = 300,
                PatientId = 66,
                DoctorId = DoctorId,
                ExaminationStatus = ExaminationConstants.InProgress
            };

            var appointment = new Appointment
            {
                Id = 300,
                PatientId = 66,
                DoctorId = DoctorId,
                Status = AppointmentConstants.InServiceStatus,
                AppointmentDate = Today,
                Examination = examination
            };

            _appointmentRepoMock
                .Setup(r => r.GetByIdWithExaminationAsync(300, It.IsAny<CancellationToken>()))
                .ReturnsAsync(appointment);
            // One diagnosis recorded, no prescription left as a draft
            _appointmentRepoMock
                .Setup(r => r.GetExaminationCompletionCountsAsync(88, It.IsAny<CancellationToken>()))
                .ReturnsAsync((1, 0));

            // Act
            var response = await _service.CompleteExaminationAsync(300, DoctorUserId);

            // Assert
            response.Status.Should().Be(AppointmentConstants.CompletedStatus);
            examination.ExaminationStatus.Should().Be("Locked");
            examination.LockedByUserId.Should().Be(DoctorUserId);

            _appointmentRepoMock.Verify(r => r.UpdateAsync(appointment), Times.Once);
            _queueServiceMock.Verify(q => q.UpdateStatusAsync(300, "Examination", "COMPLETED", It.IsAny<CancellationToken>()), Times.Once);
        }

        [Theory]
        [InlineData(0, 0, ErrorConstants.ExaminationMessage.NothingRecorded)]
        [InlineData(1, 1, ErrorConstants.ExaminationMessage.PrescriptionNotFinalized)]
        public async Task CompleteExaminationAsync_ShouldReject_WhenRecordIsNotReady(int diagnoses, int draftPrescriptions, string expected)
        {
            // Arrange
            var examination = new Examination { Id = 88, AppointmentId = 300, PatientId = 66, DoctorId = DoctorId, ExaminationStatus = ExaminationConstants.InProgress };
            var appointment = new Appointment { Id = 300, PatientId = 66, DoctorId = DoctorId, Status = AppointmentConstants.InServiceStatus, AppointmentDate = Today, Examination = examination };
            _appointmentRepoMock
                .Setup(r => r.GetByIdWithExaminationAsync(300, It.IsAny<CancellationToken>()))
                .ReturnsAsync(appointment);
            _appointmentRepoMock
                .Setup(r => r.GetExaminationCompletionCountsAsync(88, It.IsAny<CancellationToken>()))
                .ReturnsAsync((diagnoses, draftPrescriptions));

            // Act
            var act = () => _service.CompleteExaminationAsync(300, DoctorUserId);

            // Assert: nothing is locked
            await act.Should().ThrowAsync<BadRequestException>().WithMessage(expected);
            examination.ExaminationStatus.Should().Be(ExaminationConstants.InProgress);
            _appointmentRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Appointment>()), Times.Never);
        }

        [Fact]
        public async Task CompleteExaminationAsync_ShouldReject_WhenAppointmentIsNotInService()
        {
            // Arrange
            var appointment = new Appointment
            {
                Id = 300,
                DoctorId = DoctorId,
                Status = AppointmentConstants.CheckedInStatus
            };

            _appointmentRepoMock
                .Setup(r => r.GetByIdWithExaminationAsync(300, It.IsAny<CancellationToken>()))
                .ReturnsAsync(appointment);

            // Act
            var act = () => _service.CompleteExaminationAsync(300, DoctorUserId);

            // Assert
            await act.Should().ThrowAsync<BadRequestException>()
                .WithMessage(ErrorConstants.AppointmentMessage.OnlyInServiceCanBeCompleted);
        }

        [Fact]
        public async Task CompleteExaminationAsync_ShouldReject_WhenDoctorIsNotAssigned()
        {
            // Arrange
            var appointment = new Appointment
            {
                Id = 300,
                DoctorId = 999, // different doctor
                Status = AppointmentConstants.InServiceStatus
            };

            _appointmentRepoMock
                .Setup(r => r.GetByIdWithExaminationAsync(300, It.IsAny<CancellationToken>()))
                .ReturnsAsync(appointment);

            // Act
            var act = () => _service.CompleteExaminationAsync(300, DoctorUserId);

            // Assert
            await act.Should().ThrowAsync<NotFoundException>()
                .WithMessage(ErrorConstants.AppointmentMessage.AppointmentNotFound);
        }
    }
}
