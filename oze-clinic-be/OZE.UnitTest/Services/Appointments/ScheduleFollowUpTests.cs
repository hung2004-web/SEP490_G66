using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services.Appointments
{
    // OZ-APPT-21 ScheduleFollowUp
    [Trait("Tab", "OZ-APPT-21")]
    public class ScheduleFollowUpTests : AppointmentFollowUpTestBase
    {
        [Fact]
        public async Task ScheduleFollowUpAsync_ShouldCreateAppointmentAndLinkToExamination()
        {
            var original = CreateOriginalAppointment();
            var followUpDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(7));
            var slotStart = new TimeOnly(9, 0);

            _appointmentRepoMock
                .Setup(r => r.GetByIdWithExaminationAsync(OriginalAppointmentId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(original);

            SetupDoctorShift(followUpDate, new TimeOnly(8, 0), new TimeOnly(12, 0));

            Appointment? createdAppointment = null;
            _appointmentRepoMock
                .Setup(r => r.AddAsync(It.IsAny<Appointment>()))
                .Callback<Appointment>(a =>
                {
                    a.Id = 500;
                    createdAppointment = a;
                })
                .Returns(Task.CompletedTask);

            Notification? createdNotification = null;
            _appointmentRepoMock
                .Setup(r => r.AddNotificationAsync(It.IsAny<Notification>(), It.IsAny<CancellationToken>()))
                .Callback<Notification, CancellationToken>((n, _) => createdNotification = n)
                .Returns(Task.CompletedTask);

            var request = new ScheduleFollowUpRequest
            {
                Date = followUpDate,
                SlotStart = slotStart,
                Notes = "Tái khám theo hẹn"
            };

            var result = await _service.ScheduleFollowUpAsync(OriginalAppointmentId, request, "receptionist-user-1");

            result.Should().NotBeNull();
            createdAppointment.Should().NotBeNull();
            createdAppointment!.ParentAppointmentId.Should().Be(OriginalAppointmentId);
            createdAppointment.AppointmentDate.Should().Be(followUpDate);
            createdAppointment.TimeSlotStart.Should().Be(slotStart);
            createdAppointment.Status.Should().Be(AppointmentConstants.PendingStatus);

            original.Examination!.FollowUpAppointmentId.Should().Be(500);
            original.Examination.FollowUpDate.Should().Be(followUpDate);
            original.Examination.FollowUpNotes.Should().Be("Tái khám theo hẹn");

            createdNotification.Should().NotBeNull();
            createdNotification!.UserId.Should().Be("user-patient-15");

            _auditLogMock.Verify(a => a.LogAsync(
                AuditConstants.AppointmentFollowUpScheduled,
                AuditConstants.AppointmentEntity,
                "500",
                It.IsAny<object?>(),
                It.IsAny<object?>(),
                It.IsAny<string?>()), Times.Once);
        }

        [Fact]
        public async Task ScheduleFollowUpAsync_ShouldThrowBadRequest_WhenDateIsNotAfterOriginal()
        {
            var original = CreateOriginalAppointment();
            _appointmentRepoMock
                .Setup(r => r.GetByIdWithExaminationAsync(OriginalAppointmentId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(original);

            var request = new ScheduleFollowUpRequest
            {
                Date = original.AppointmentDate, // Same day
                SlotStart = new TimeOnly(14, 0)
            };

            var act = () => _service.ScheduleFollowUpAsync(OriginalAppointmentId, request, "staff-1");

            (await act.Should().ThrowAsync<BadRequestException>())
                .WithMessage(ErrorConstants.ExaminationMessage.FollowUpDateMustBeFuture);
        }

        [Fact]
        public async Task ScheduleFollowUpAsync_ShouldThrowBadRequest_WhenAlreadyScheduled()
        {
            var original = CreateOriginalAppointment();
            original.Examination!.FollowUpAppointmentId = 999;

            _appointmentRepoMock
                .Setup(r => r.GetByIdWithExaminationAsync(OriginalAppointmentId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(original);

            var request = new ScheduleFollowUpRequest
            {
                Date = DateOnly.FromDateTime(ClinicClock.Today.AddDays(7)),
                SlotStart = new TimeOnly(9, 0)
            };

            var act = () => _service.ScheduleFollowUpAsync(OriginalAppointmentId, request, "staff-1");

            (await act.Should().ThrowAsync<BadRequestException>())
                .WithMessage(ErrorConstants.AppointmentMessage.FollowUpAlreadyScheduled);
        }

        [Fact]
        public async Task ScheduleFollowUpAsync_ShouldAllowScheduling_WhenCurrentAppointmentIsInService()
        {
            // The appointment is currently IN_SERVICE today (doctor is examining the patient right now)
            var original = CreateOriginalAppointment(status: AppointmentConstants.InServiceStatus);
            var followUpDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(5));
            var slotStart = new TimeOnly(10, 0);

            _appointmentRepoMock
                .Setup(r => r.GetByIdWithExaminationAsync(OriginalAppointmentId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(original);

            SetupDoctorShift(followUpDate, new TimeOnly(8, 0), new TimeOnly(12, 0));

            // HasUnfinishedAppointmentAsync passes excludeAppointmentId = original.Id, returning false
            _appointmentRepoMock
                .Setup(r => r.HasUnfinishedAppointmentAsync(_patient.Id, OriginalAppointmentId))
                .ReturnsAsync(false);

            Appointment? createdAppointment = null;
            _appointmentRepoMock
                .Setup(r => r.AddAsync(It.IsAny<Appointment>()))
                .Callback<Appointment>(a =>
                {
                    a.Id = 501;
                    createdAppointment = a;
                })
                .Returns(Task.CompletedTask);

            var request = new ScheduleFollowUpRequest
            {
                Date = followUpDate,
                SlotStart = slotStart,
                Notes = "Tái khám sau trám tủy"
            };

            var result = await _service.ScheduleFollowUpAsync(OriginalAppointmentId, request, "doctor-user-1");

            result.Should().NotBeNull();
            createdAppointment.Should().NotBeNull();
            createdAppointment!.ParentAppointmentId.Should().Be(OriginalAppointmentId);
        }
    }
}
