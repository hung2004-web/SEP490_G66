using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services
{
    // Check-in: only a confirmed appointment, only on the day of the appointment, any time of that day
    public class AppointmentCheckInTests
    {
        private readonly Mock<IAppointmentRepository> _appointmentRepositoryMock = new();
        private readonly Mock<IAuditLogService> _auditLogServiceMock = new();
        private readonly AppointmentService _service;

        public AppointmentCheckInTests()
        {
            _service = new AppointmentService(
                _appointmentRepositoryMock.Object,
                new Mock<IRegistrationRepository>().Object,
                new Mock<IServiceRepository>().Object,
                new Mock<ISmsSender>().Object,
                new Mock<IEmailSender>().Object,
                _auditLogServiceMock.Object,
                new Mock<ILogger<AppointmentService>>().Object);
        }

        private void ArrangeAppointment(string status, DateOnly date, TimeOnly slotStart)
        {
            var appointment = new Appointment
            {
                Id = 100,
                Status = status,
                AppointmentDate = date,
                TimeSlotStart = slotStart,
                Patient = new Patient { FullName = "Tran Thi B" }
            };
            _appointmentRepositoryMock
                .Setup(r => r.GetByIdWithDetailsAsync(100, It.IsAny<CancellationToken>()))
                .ReturnsAsync(appointment);
        }

        private static DateOnly Today => DateOnly.FromDateTime(DateTime.Today);

        // Only the date is checked, never the time of day, so the slot time does not matter
        [Fact]
        public async Task CheckInAppointmentAsync_ShouldCheckIn_WhenConfirmedAndTheDayOfTheAppointment()
        {
            ArrangeAppointment(AppointmentConstants.ConfirmedStatus, Today, new TimeOnly(8, 0));

            var result = await _service.CheckInAppointmentAsync(100);

            result.Status.Should().Be(AppointmentConstants.CheckedInStatus);
            result.CheckInAt.Should().NotBeNull();
            _appointmentRepositoryMock.Verify(r => r.UpdateAsync(It.IsAny<Appointment>()), Times.Once);
            _auditLogServiceMock.Verify(a => a.LogAsync(AuditConstants.AppointmentCheckedIn, AuditConstants.AppointmentEntity,
                "100", It.IsAny<object?>(), It.IsAny<object?>(), It.IsAny<string?>()), Times.Once);
        }

        [Fact]
        public async Task CheckInAppointmentAsync_ShouldReject_WhenStillPending()
        {
            ArrangeAppointment(AppointmentConstants.PendingStatus, Today, new TimeOnly(8, 0));

            var act = () => _service.CheckInAppointmentAsync(100);

            (await act.Should().ThrowAsync<BadRequestException>())
                .WithMessage(ErrorConstants.AppointmentMessage.CheckInNeedsConfirmation);
            _appointmentRepositoryMock.Verify(r => r.UpdateAsync(It.IsAny<Appointment>()), Times.Never);
        }

        [Theory]
        [InlineData(1)]
        [InlineData(-1)]
        public async Task CheckInAppointmentAsync_ShouldReject_WhenNotTheDayOfTheAppointment(int dayOffset)
        {
            ArrangeAppointment(AppointmentConstants.ConfirmedStatus, Today.AddDays(dayOffset), new TimeOnly(8, 0));

            var act = () => _service.CheckInAppointmentAsync(100);

            (await act.Should().ThrowAsync<BadRequestException>())
                .WithMessage(ErrorConstants.AppointmentMessage.CheckInWrongDay);
        }

        [Theory]
        [InlineData(AppointmentConstants.CancelledStatus)]
        [InlineData(AppointmentConstants.CheckedInStatus)]
        [InlineData(AppointmentConstants.InServiceStatus)]
        [InlineData(AppointmentConstants.CompletedStatus)]
        [InlineData(AppointmentConstants.NoShowStatus)]
        public async Task CheckInAppointmentAsync_ShouldReject_WhenNotConfirmed(string status)
        {
            ArrangeAppointment(status, Today, new TimeOnly(8, 0));

            var act = () => _service.CheckInAppointmentAsync(100);

            (await act.Should().ThrowAsync<BadRequestException>())
                .WithMessage(ErrorConstants.AppointmentMessage.OnlyConfirmedCanBeCheckedIn);
        }

        [Fact]
        public async Task CheckInAppointmentAsync_ShouldReturnNotFound_WhenAppointmentDoesNotExist()
        {
            _appointmentRepositoryMock
                .Setup(r => r.GetByIdWithDetailsAsync(100, It.IsAny<CancellationToken>()))
                .ReturnsAsync((Appointment?)null);

            var act = () => _service.CheckInAppointmentAsync(100);

            await act.Should().ThrowAsync<NotFoundException>();
        }
    }
}
