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
    // OZ-APPT-18 StartExamination
    [Trait("Tab", "OZ-APPT-18")]
    public class StartExaminationResumeTests : AppointmentQueueTestBase
    {
        [Fact]
        public async Task StartExaminationAsync_ShouldResumeExistingExamination_WhenReturningFromImaging()
        {
            // Arrange
            var existingExam = new Examination
            {
                Id = 77,
                AppointmentId = 200,
                PatientId = 55,
                DoctorId = DoctorId,
                ExaminationStatus = ExaminationConstants.InProgress,
                ChiefComplaint = "Toothache"
            };

            var appointment = new Appointment
            {
                Id = 200,
                PatientId = 55,
                DoctorId = DoctorId,
                Status = AppointmentConstants.CheckedInStatus,
                AppointmentDate = Today,
                Examination = existingExam
            };

            _appointmentRepoMock
                .Setup(r => r.GetByIdWithExaminationAsync(200, It.IsAny<CancellationToken>()))
                .ReturnsAsync(appointment);

            _appointmentRepoMock
                .Setup(r => r.HasAppointmentInServiceAsync(DoctorId, Today))
                .ReturnsAsync(false);

            // Act
            var response = await _service.StartExaminationAsync(200, DoctorUserId);

            // Assert
            response.ExaminationId.Should().Be(77);
            appointment.Status.Should().Be(AppointmentConstants.InServiceStatus);

            _appointmentRepoMock.Verify(r => r.UpdateAsync(appointment), Times.Once);
            _queueServiceMock.Verify(q => q.UpdateStatusAsync(200, "Examination", "IN_PROGRESS", It.IsAny<CancellationToken>()), Times.Once);
        }
    }

    // OZ-APPT-18 StartExamination
    [Trait("Tab", "OZ-APPT-18")]
    public class StartExaminationTests : StartExaminationTestBase
    {
        [Fact]
        public async Task StartExaminationAsync_ShouldCreateOneExamination_WhenCheckedInForThisDoctor()
        {
            ArrangeAppointment(AppointmentConstants.CheckedInStatus);
            Examination? saved = null;
            _appointmentRepositoryMock
                .Setup(r => r.SaveStartedExaminationAsync(It.IsAny<Appointment>(), It.IsAny<Examination>(), It.IsAny<CancellationToken>()))
                .Callback<Appointment, Examination, CancellationToken>((appointment, examination, _) =>
                {
                    saved = examination;
                    examination.Id = 55;
                    appointment.Status.Should().Be(AppointmentConstants.InServiceStatus);
                })
                .Returns(Task.CompletedTask);

            var result = await _service.StartExaminationAsync(100, DoctorUserId);

            result.ExaminationId.Should().Be(55);
            result.AppointmentId.Should().Be(100);
            result.PatientId.Should().Be(20);
            result.DoctorId.Should().Be(DoctorId);
            result.ExaminationStatus.Should().Be(ExaminationConstants.InProgress);
            result.AppointmentStatus.Should().Be(AppointmentConstants.InServiceStatus);
            saved.Should().NotBeNull();
            saved!.PatientId.Should().Be(20);
            saved.DoctorId.Should().Be(DoctorId);
            saved.ExaminationStatus.Should().Be(ExaminationConstants.InProgress);
            _appointmentRepositoryMock.Verify(
                r => r.SaveStartedExaminationAsync(It.IsAny<Appointment>(), It.IsAny<Examination>(), It.IsAny<CancellationToken>()),
                Times.Once);
            _auditLogServiceMock.Verify(a => a.LogAsync(AuditConstants.AppointmentExaminationStarted, AuditConstants.AppointmentEntity,
                "100", It.IsAny<object?>(), It.IsAny<object?>(), It.IsAny<string?>()), Times.Once);
        }

        [Theory]
        [InlineData(AppointmentConstants.PendingStatus)]
        [InlineData(AppointmentConstants.ConfirmedStatus)]
        [InlineData(AppointmentConstants.InServiceStatus)]
        [InlineData(AppointmentConstants.CompletedStatus)]
        [InlineData(AppointmentConstants.CancelledStatus)]
        [InlineData(AppointmentConstants.NoShowStatus)]
        public async Task StartExaminationAsync_ShouldReject_WhenNotCheckedIn(string status)
        {
            ArrangeAppointment(status);

            var act = () => _service.StartExaminationAsync(100, DoctorUserId);

            (await act.Should().ThrowAsync<BadRequestException>())
                .WithMessage(ErrorConstants.AppointmentMessage.OnlyCheckedInCanBeStarted);
            _appointmentRepositoryMock.Verify(
                r => r.SaveStartedExaminationAsync(It.IsAny<Appointment>(), It.IsAny<Examination>(), It.IsAny<CancellationToken>()),
                Times.Never);
        }

        [Fact]
        public async Task StartExaminationAsync_ShouldReject_WhenTheAppointmentIsNotToday()
        {
            ArrangeAppointment(AppointmentConstants.CheckedInStatus, date: DateOnly.FromDateTime(DateTime.Today).AddDays(1));

            var act = () => _service.StartExaminationAsync(100, DoctorUserId);

            (await act.Should().ThrowAsync<BadRequestException>())
                .WithMessage(ErrorConstants.AppointmentMessage.ExaminationWrongDay);
            _appointmentRepositoryMock.Verify(
                r => r.SaveStartedExaminationAsync(It.IsAny<Appointment>(), It.IsAny<Examination>(), It.IsAny<CancellationToken>()),
                Times.Never);
        }

        [Fact]
        public async Task StartExaminationAsync_ShouldReject_WhenTheDoctorIsAlreadyExamining()
        {
            ArrangeAppointment(AppointmentConstants.CheckedInStatus);
            _appointmentRepositoryMock
                .Setup(r => r.HasAppointmentInServiceAsync(DoctorId, DateOnly.FromDateTime(DateTime.Today)))
                .ReturnsAsync(true);

            var act = () => _service.StartExaminationAsync(100, DoctorUserId);

            (await act.Should().ThrowAsync<BadRequestException>())
                .WithMessage(ErrorConstants.AppointmentMessage.DoctorAlreadyExamining);
            _appointmentRepositoryMock.Verify(
                r => r.SaveStartedExaminationAsync(It.IsAny<Appointment>(), It.IsAny<Examination>(), It.IsAny<CancellationToken>()),
                Times.Never);
        }

        [Fact]
        public async Task StartExaminationAsync_ShouldCopyTheBookingNoteToTheChiefComplaint()
        {
            ArrangeAppointment(AppointmentConstants.CheckedInStatus, notes: "Dau rang ham duoi");
            Examination? saved = null;
            _appointmentRepositoryMock
                .Setup(r => r.SaveStartedExaminationAsync(It.IsAny<Appointment>(), It.IsAny<Examination>(), It.IsAny<CancellationToken>()))
                .Callback<Appointment, Examination, CancellationToken>((_, examination, _) => saved = examination)
                .Returns(Task.CompletedTask);

            var result = await _service.StartExaminationAsync(100, DoctorUserId);

            saved!.ChiefComplaint.Should().Be("Dau rang ham duoi");
            result.ChiefComplaint.Should().Be("Dau rang ham duoi");
        }

        [Fact]
        public async Task StartExaminationAsync_ShouldReject_WhenTheDoctorIsNotAssigned()
        {
            ArrangeAppointment(AppointmentConstants.CheckedInStatus, doctorId: 8);

            var act = () => _service.StartExaminationAsync(100, DoctorUserId);

            (await act.Should().ThrowAsync<ForbiddenException>())
                .WithMessage(ErrorConstants.AppointmentMessage.NotAssignedDoctor);
            _appointmentRepositoryMock.Verify(
                r => r.SaveStartedExaminationAsync(It.IsAny<Appointment>(), It.IsAny<Examination>(), It.IsAny<CancellationToken>()),
                Times.Never);
        }

        [Fact]
        public async Task StartExaminationAsync_ShouldReturnNotFound_WhenAppointmentDoesNotExist()
        {
            _appointmentRepositoryMock
                .Setup(r => r.GetByIdWithDetailsAsync(100, It.IsAny<CancellationToken>()))
                .ReturnsAsync((Appointment?)null);

            var act = () => _service.StartExaminationAsync(100, DoctorUserId);

            await act.Should().ThrowAsync<NotFoundException>();
        }

        [Fact]
        public async Task StartExaminationAsync_ShouldReturnNotFound_WhenTheAccountHasNoDoctorProfile()
        {
            _appointmentRepositoryMock
                .Setup(r => r.GetStaffProfileIdByUserIdAsync(DoctorUserId))
                .ReturnsAsync((int?)null);

            var act = () => _service.StartExaminationAsync(100, DoctorUserId);

            (await act.Should().ThrowAsync<NotFoundException>())
                .WithMessage(ErrorConstants.AppointmentMessage.DoctorProfileNotFound);
            _appointmentRepositoryMock.Verify(
                r => r.GetByIdWithDetailsAsync(It.IsAny<long>(), It.IsAny<CancellationToken>()),
                Times.Never);
        }
    }
}
