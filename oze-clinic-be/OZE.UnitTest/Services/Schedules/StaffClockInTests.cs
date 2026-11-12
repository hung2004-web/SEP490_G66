using FluentAssertions;
using Moq;
using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Exceptions;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services.Schedules
{
    // OZ-SCH-02 Chấm công vào ca / ra ca cho mọi nhân viên (lễ tân, kỹ thuật viên) qua api/schedules/my/{id}/start|end
    [Trait("Tab", "OZ-SCH-02")]
    public class StaffClockInTests
    {
        private readonly Mock<IWorkShiftRepository> _shiftRepo = new();
        private readonly Mock<IAppointmentRepository> _appointmentRepo = new();
        private readonly Mock<IStaffRepository> _staffRepo = new();
        private readonly DoctorScheduleService _service;
        private readonly StaffProfile _receptionist = new() { Id = 7, UserId = "le-tan", FullName = "Le Tan" };

        public StaffClockInTests()
        {
            _service = new DoctorScheduleService(_shiftRepo.Object, _appointmentRepo.Object, _staffRepo.Object);
            _staffRepo.Setup(r => r.GetByUserIdAsync("le-tan")).ReturnsAsync(_receptionist);
            // A receptionist has no appointments of their own
            _appointmentRepo.Setup(r => r.GetDoctorAppointmentsAsync(7, It.IsAny<DateOnly>(), It.IsAny<DateOnly>())).ReturnsAsync(new List<Appointment>());
            _appointmentRepo.Setup(r => r.GetDoctorOpenAppointmentsAsync(7, It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Appointment>());
        }

        // A shift of today running now, whatever the time the test runs
        private StaffSchedule ShiftNow(int staffId = 7, TimeOnly? started = null)
        {
            var now = TimeOnly.FromDateTime(ClinicClock.Now);
            var start = now.Hour == 0 && now.Minute < 10 ? TimeOnly.MinValue : now.AddMinutes(-10);
            var shift = new StaffSchedule
            {
                Id = 70,
                StaffProfileId = staffId,
                RoomId = 3,
                Room = new Room { Id = 3, RoomName = "Quay le tan" },
                ScheduleDate = DateOnly.FromDateTime(ClinicClock.Today),
                ShiftStart = start,
                ShiftEnd = TimeOnly.MaxValue,
                ActualStartTime = started
            };
            _shiftRepo.Setup(r => r.GetByIdAsync(70)).ReturnsAsync(shift);
            return shift;
        }

        // UTCID01 (N): a receptionist clocks in on their own shift of today
        [Fact]
        public async Task Start_OwnShift_RecordsClockIn()
        {
            var shift = ShiftNow();

            var result = await _service.StartShiftAsync("le-tan", 70);

            shift.ActualStartTime.Should().NotBeNull();
            shift.IsPresent.Should().BeTrue();
            result.ActualStartTime.Should().Be(shift.ActualStartTime);
            _shiftRepo.Verify(r => r.SaveChangesAsync(), Times.Once);
        }

        // UTCID02 (N): clocking out records the time and marks nobody NO_SHOW (no patients of a receptionist)
        [Fact]
        public async Task End_OwnStartedShift_RecordsClockOut()
        {
            var shift = ShiftNow(started: TimeOnly.MinValue);

            var result = await _service.EndShiftAsync("le-tan", 70);

            shift.ActualEndTime.Should().NotBeNull();
            result.NoShowAppointmentIds.Should().BeEmpty();
            _appointmentRepo.Verify(r => r.UpdateAsync(It.IsAny<Appointment>()), Times.Never);
        }

        // UTCID03 (A): another staff member's shift is not found
        [Fact]
        public async Task Start_ShiftOfSomeoneElse_NotFound()
        {
            ShiftNow(staffId: 99);

            var act = () => _service.StartShiftAsync("le-tan", 70);

            await act.Should().ThrowAsync<NotFoundException>();
        }

        // UTCID04 (A): a shift not started cannot be ended
        [Fact]
        public async Task End_NotStarted_BadRequest()
        {
            ShiftNow();

            var act = () => _service.EndShiftAsync("le-tan", 70);

            await act.Should().ThrowAsync<BadRequestException>();
        }
    }
}
