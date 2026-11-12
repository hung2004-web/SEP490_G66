using FluentAssertions;
using Moq;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services.Schedules
{
    // OZ-SCH-01 DoctorsOnDuty (bác sĩ trong ca cho lễ tân)
    [Trait("Tab", "OZ-SCH-01")]
    public class DoctorsOnDutyTests
    {
        private readonly Mock<IWorkShiftRepository> _shiftRepo = new();
        private readonly Mock<IStaffRepository> _staffRepo = new();
        private readonly Mock<ILeaveRequestRepository> _leaveRepo = new();
        private readonly ScheduleViewService _service;
        private readonly DateOnly _date = new(2026, 11, 11);

        public DoctorsOnDutyTests()
        {
            _service = new ScheduleViewService(_shiftRepo.Object, _staffRepo.Object, _leaveRepo.Object);
        }

        private static StaffSchedule Shift(int staffId, int hour, TimeOnly? started = null, TimeOnly? ended = null) => new()
        {
            Id = staffId * 10 + hour,
            StaffProfileId = staffId,
            StaffProfile = new StaffProfile { Id = staffId, UserId = $"u{staffId}", FullName = $"Bac si {staffId}" },
            Room = new Room { RoomName = "Phong kham 1" },
            ShiftStart = new TimeOnly(hour, 0),
            ShiftEnd = new TimeOnly(hour + 4, 0),
            ActualStartTime = started,
            ActualEndTime = ended
        };

        // UTCID01 (N): status follows clock-in, clock-out and approved leave
        [Fact]
        public async Task OnDuty_ReportsStatusPerShift()
        {
            _shiftRepo.Setup(r => r.GetDoctorShiftsOnDateAsync(_date)).ReturnsAsync(new List<StaffSchedule>
            {
                Shift(1, 8),
                Shift(2, 8, started: new TimeOnly(8, 2)),
                Shift(3, 8, started: new TimeOnly(8, 0), ended: new TimeOnly(11, 0)),
                Shift(4, 13)
            });
            _leaveRepo.Setup(r => r.GetApprovedOnDateAsync(_date, It.IsAny<CancellationToken>())).ReturnsAsync(new List<LeaveRequest>
            {
                new() { StaffProfileId = 4, Slot = LeaveRequestConstants.SlotAfternoon, Status = LeaveRequestConstants.Approved }
            });

            var result = await _service.GetDoctorsOnDutyAsync(new DoctorsOnDutyQuery { Date = _date });

            result.Select(x => x.Status).Should().Equal(DutyStatus.NotStarted, DutyStatus.Working, DutyStatus.Ended, DutyStatus.OnLeave);
            result[0].DoctorId.Should().Be(1);
            result[0].RoomName.Should().Be("Phong kham 1");
        }
    }
}
