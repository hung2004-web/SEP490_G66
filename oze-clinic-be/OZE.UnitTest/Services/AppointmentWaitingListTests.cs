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
    // Waiting order: booked on time (by booked time), booked late (by check-in time), walk-ins (by check-in time)
    public class AppointmentWaitingListTests
    {
        private const int LateMinutes = 15;
        private const int DoctorId = 7;
        private const string DoctorUserId = "doctor-user-1";

        private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.Today);

        private readonly Mock<IAppointmentRepository> _appointmentRepositoryMock = new();
        private readonly AppointmentService _service;

        public AppointmentWaitingListTests()
        {
            _service = new AppointmentService(
                _appointmentRepositoryMock.Object,
                new Mock<IRegistrationRepository>().Object,
                new Mock<IServiceRepository>().Object,
                new Mock<ISmsSender>().Object,
                new Mock<IEmailSender>().Object,
                new Mock<IAuditLogService>().Object,
                new Mock<ILogger<AppointmentService>>().Object);

            _appointmentRepositoryMock
                .Setup(r => r.GetConfigValueAsync(ConfigKeyConstants.CheckInLateMinutes))
                .ReturnsAsync(LateMinutes.ToString());
        }

        private static Appointment Booked(long id, string slot, string checkIn) => Make(id, AppointmentConstants.BookedType, slot, checkIn);

        private static Appointment WalkIn(long id, string checkIn) => Make(id, AppointmentConstants.WalkInType, null, checkIn);

        private static Appointment Make(long id, string type, string? slot, string checkIn) => new()
        {
            Id = id,
            PatientId = (int)id,
            Patient = new Patient { FullName = $"Patient {id}" },
            DoctorId = DoctorId,
            AppointmentType = type,
            AppointmentDate = Today,
            TimeSlotStart = slot == null ? null : TimeOnly.Parse(slot),
            Status = AppointmentConstants.CheckedInStatus,
            CheckInAt = new DateTimeOffset(DateTime.Today.Add(TimeSpan.Parse(checkIn)))
        };

        private void ArrangeWaiting(params Appointment[] appointments)
        {
            _appointmentRepositoryMock
                .Setup(r => r.GetWaitingAppointmentsAsync(Today, It.IsAny<int?>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(appointments.ToList());
        }

        private async Task<List<long>> OrderOf() =>
            (await _service.GetWaitingListAsync(null, null)).Select(x => x.AppointmentId).ToList();

        [Fact]
        public async Task GetWaitingListAsync_ShouldOrderOnTimePatientsByBookedTime_NotByArrival()
        {
            // 1 arrived first but is booked later; 2 is booked earlier and still on time
            ArrangeWaiting(Booked(1, "08:30", "08:00"), Booked(2, "08:00", "08:10"));

            (await OrderOf()).Should().Equal(2, 1);
        }

        [Fact]
        public async Task GetWaitingListAsync_ShouldNotTreatEarlyArrivalAsLate()
        {
            ArrangeWaiting(Booked(1, "10:00", "07:00"));

            var result = await _service.GetWaitingListAsync(null, null);

            result.Single().IsLate.Should().BeFalse();
        }

        [Fact]
        public async Task GetWaitingListAsync_ShouldTreatCheckInAtExactlyTheAllowedDelayAsOnTime()
        {
            ArrangeWaiting(Booked(1, "08:00", "08:15"));

            (await _service.GetWaitingListAsync(null, null)).Single().IsLate.Should().BeFalse();
        }

        [Fact]
        public async Task GetWaitingListAsync_ShouldPutLateBookedPatientAfterOnTime_ButBeforeWalkIn()
        {
            // 1 is on time, 2 is booked but late, 3 is a walk-in who checked in before 2
            ArrangeWaiting(WalkIn(3, "08:30"), Booked(2, "08:00", "08:40"), Booked(1, "09:00", "08:55"));

            var result = await _service.GetWaitingListAsync(null, null);

            result.Select(x => x.AppointmentId).Should().Equal(1, 2, 3);
            result.Select(x => x.IsLate).Should().Equal(false, true, false);
        }

        [Fact]
        public async Task GetWaitingListAsync_ShouldOrderLatePatientsAndWalkInsByCheckInTime()
        {
            ArrangeWaiting(
                Booked(1, "08:00", "09:00"), Booked(2, "08:00", "08:40"),
                WalkIn(3, "09:10"), WalkIn(4, "08:20"));

            (await OrderOf()).Should().Equal(2, 1, 4, 3);
        }

        [Fact]
        public async Task GetWaitingListAsync_ShouldNumberPositionsFromOne_AndNeverMarkWalkInLate()
        {
            ArrangeWaiting(Booked(1, "08:00", "08:00"), WalkIn(2, "08:05"));

            var result = await _service.GetWaitingListAsync(null, null);

            result.Select(x => x.Position).Should().Equal(1, 2);
            result[1].IsLate.Should().BeFalse();
            result[1].TimeSlotStart.Should().BeNull();
        }

        [Fact]
        public async Task GetWaitingListAsync_ShouldReturnEmpty_WhenNobodyIsWaiting()
        {
            ArrangeWaiting();

            (await _service.GetWaitingListAsync(null, null)).Should().BeEmpty();
        }

        [Fact]
        public async Task GetWaitingListAsync_ShouldPassTheRequestedDoctor_ForStaff()
        {
            ArrangeWaiting();

            await _service.GetWaitingListAsync(DoctorId, null);

            _appointmentRepositoryMock.Verify(r => r.GetWaitingAppointmentsAsync(Today, DoctorId, It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task GetWaitingListAsync_ShouldLimitADoctorToTheirOwnList_IgnoringTheRequestedDoctor()
        {
            ArrangeWaiting();
            _appointmentRepositoryMock
                .Setup(r => r.GetStaffProfileIdByUserIdAsync(DoctorUserId))
                .ReturnsAsync(DoctorId);

            await _service.GetWaitingListAsync(999, DoctorUserId);

            _appointmentRepositoryMock.Verify(r => r.GetWaitingAppointmentsAsync(Today, DoctorId, It.IsAny<CancellationToken>()), Times.Once);
            _appointmentRepositoryMock.Verify(r => r.GetWaitingAppointmentsAsync(Today, 999, It.IsAny<CancellationToken>()), Times.Never);
        }

        [Fact]
        public async Task GetWaitingListAsync_ShouldReturnNotFound_WhenTheDoctorAccountHasNoProfile()
        {
            _appointmentRepositoryMock
                .Setup(r => r.GetStaffProfileIdByUserIdAsync(DoctorUserId))
                .ReturnsAsync((int?)null);

            var act = () => _service.GetWaitingListAsync(null, DoctorUserId);

            await act.Should().ThrowAsync<NotFoundException>();
        }
    }
}
