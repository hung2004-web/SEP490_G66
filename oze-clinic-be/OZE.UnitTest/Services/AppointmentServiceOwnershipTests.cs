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

namespace OZE.UnitTest.Services
{
    // A patient may only see or cancel their own appointments; staff (null owner) can reach all of them
    public class AppointmentServiceOwnershipTests
    {
        private const string OwnerUserId = "patient-user-1";
        private const string OtherUserId = "patient-user-2";

        private readonly Mock<IAppointmentRepository> _appointmentRepositoryMock = new();
        private readonly AppointmentService _service;

        public AppointmentServiceOwnershipTests()
        {
            _service = new AppointmentService(
                _appointmentRepositoryMock.Object,
                new Mock<IRegistrationRepository>().Object,
                new Mock<IServiceRepository>().Object,
                new Mock<ISmsSender>().Object,
                new Mock<IEmailSender>().Object,
                new Mock<ILogger<AppointmentService>>().Object);
        }

        private Appointment ArrangeAppointment(string status = AppointmentConstants.PendingStatus)
        {
            var appointment = new Appointment
            {
                Id = 100,
                Status = status,
                AppointmentDate = DateOnly.FromDateTime(DateTime.Now.AddDays(10)),
                TimeSlotStart = new TimeOnly(9, 0),
                Patient = new Patient { UserId = OwnerUserId, FullName = "Tran Thi B" }
            };
            _appointmentRepositoryMock
                .Setup(r => r.GetByIdWithDetailsAsync(100, It.IsAny<CancellationToken>()))
                .ReturnsAsync(appointment);
            _appointmentRepositoryMock
                .Setup(r => r.GetConfigValueAsync(ConfigKeyConstants.BookingCancelCutoffHours))
                .ReturnsAsync("24");
            return appointment;
        }

        [Fact]
        public async Task GetAppointmentByIdAsync_ShouldReturn_WhenPatientOwnsIt()
        {
            ArrangeAppointment();

            var result = await _service.GetAppointmentByIdAsync(100, OwnerUserId);

            result.Id.Should().Be(100);
        }

        [Fact]
        public async Task GetAppointmentByIdAsync_ShouldReturn_WhenStaff()
        {
            ArrangeAppointment();

            var result = await _service.GetAppointmentByIdAsync(100, null);

            result.Id.Should().Be(100);
        }

        [Theory]
        [InlineData(OtherUserId)]
        [InlineData("")]
        public async Task GetAppointmentByIdAsync_ShouldThrowNotFound_WhenAnotherPatient(string callerUserId)
        {
            ArrangeAppointment();

            var act = () => _service.GetAppointmentByIdAsync(100, callerUserId);

            await act.Should().ThrowAsync<NotFoundException>();
        }

        [Fact]
        public async Task CancelAppointmentAsync_ShouldCancel_WhenPatientOwnsIt()
        {
            var appointment = ArrangeAppointment();

            var result = await _service.CancelAppointmentAsync(100, new CancelAppointmentRequest { Reason = "Bận việc" }, OwnerUserId, OwnerUserId);

            result.Status.Should().Be(AppointmentConstants.CancelledStatus);
            appointment.CancelledByUserId.Should().Be(OwnerUserId);
        }

        [Fact]
        public async Task CancelAppointmentAsync_ShouldThrowNotFoundAndKeepStatus_WhenAnotherPatient()
        {
            var appointment = ArrangeAppointment();

            var act = () => _service.CancelAppointmentAsync(100, new CancelAppointmentRequest { Reason = "Bận việc" }, OtherUserId, OtherUserId);

            await act.Should().ThrowAsync<NotFoundException>();
            appointment.Status.Should().Be(AppointmentConstants.PendingStatus);
            _appointmentRepositoryMock.Verify(r => r.UpdateAsync(It.IsAny<Appointment>()), Times.Never);
        }

        [Fact]
        public async Task CancelAppointmentAsync_ShouldCancel_WhenStaff()
        {
            ArrangeAppointment();

            var result = await _service.CancelAppointmentAsync(100, new CancelAppointmentRequest { Reason = "Không liên lạc được" }, "staff-1", null);

            result.Status.Should().Be(AppointmentConstants.CancelledStatus);
        }
    }
}
