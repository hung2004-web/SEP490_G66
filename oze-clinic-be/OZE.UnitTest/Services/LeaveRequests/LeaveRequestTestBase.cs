using FluentAssertions;
using Moq;
using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services.LeaveRequests
{
    // Shared setup of the leave request tabs (OZ-LEAVE-01, OZ-LEAVE-02)
    public abstract class LeaveRequestTestBase
    {
        protected const string StaffUserId = "bs-1";
        protected const string SubstituteUserId = "bs-2";
        protected const string ManagerId = "ql-1";

        protected readonly Mock<ILeaveRequestRepository> _leaveRepo = new();
        protected readonly Mock<IWorkShiftRepository> _shiftRepo = new();
        protected readonly Mock<IStaffRepository> _staffRepo = new();
        protected readonly Mock<IAuditLogService> _audit = new();
        protected readonly LeaveRequestService _service;

        protected readonly StaffProfile _staff = new() { Id = 2, UserId = StaffUserId, FullName = "Bac si A", IsActive = true };
        protected readonly StaffProfile _substitute = new() { Id = 3, UserId = SubstituteUserId, FullName = "Bac si B", IsActive = true };
        protected readonly DateOnly _leaveDate = DateOnly.FromDateTime(ClinicClock.Today).AddDays(3);

        protected LeaveRequestTestBase()
        {
            _service = new LeaveRequestService(_leaveRepo.Object, _shiftRepo.Object, _staffRepo.Object, _audit.Object);
            _staffRepo.Setup(r => r.GetByUserIdAsync(StaffUserId)).ReturnsAsync(_staff);
            _staffRepo.Setup(r => r.GetByUserIdAsync(SubstituteUserId)).ReturnsAsync(_substitute);
            _leaveRepo.Setup(r => r.GetRolesAsync(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
                      .ReturnsAsync(new Dictionary<string, string>
                      {
                          [StaffUserId] = RoleConstants.DoctorRole,
                          [SubstituteUserId] = RoleConstants.DoctorRole
                      });
            _leaveRepo.Setup(r => r.ExecuteInTransactionAsync(It.IsAny<Func<Task<LeaveRequest>>>(), It.IsAny<CancellationToken>()))
                      .Returns((Func<Task<LeaveRequest>> action, CancellationToken _) => action());
            GivenShifts();
            GivenAppointments();
        }

        protected StaffSchedule Shift(int hourStart, int hourEnd) => new()
        {
            Id = hourStart,
            StaffProfileId = _staff.Id,
            ScheduleDate = _leaveDate,
            ShiftStart = new TimeOnly(hourStart, 0),
            ShiftEnd = new TimeOnly(hourEnd, 0)
        };

        protected void GivenShifts(params StaffSchedule[] shifts) =>
            _leaveRepo.Setup(r => r.GetShiftsOnDateAsync(It.IsAny<int>(), _leaveDate, It.IsAny<CancellationToken>()))
                      .ReturnsAsync(shifts.ToList());

        protected void GivenAppointments(params Appointment[] appointments) =>
            _leaveRepo.Setup(r => r.GetOpenAppointmentsOnDateAsync(It.IsAny<int>(), _leaveDate, It.IsAny<CancellationToken>()))
                      .ReturnsAsync(appointments.ToList());

        protected LeaveRequest PendingLeave(string? slot = null)
        {
            var leave = new LeaveRequest
            {
                Id = 11,
                StaffProfileId = _staff.Id,
                StaffProfile = _staff,
                LeaveDate = _leaveDate,
                Slot = slot,
                Reason = "Viec gia dinh",
                Status = LeaveRequestConstants.Pending
            };
            _leaveRepo.Setup(r => r.GetByIdAsync(leave.Id, It.IsAny<CancellationToken>())).ReturnsAsync(leave);
            return leave;
        }

        protected static Appointment Booked(int hour) => new()
        {
            Id = hour,
            AppointmentDate = default,
            TimeSlotStart = new TimeOnly(hour, 0),
            TimeSlotEnd = new TimeOnly(hour, 30),
            Status = AppointmentConstants.ConfirmedStatus,
            Patient = new Patient { FullName = "Benh nhan" }
        };
    }
}
