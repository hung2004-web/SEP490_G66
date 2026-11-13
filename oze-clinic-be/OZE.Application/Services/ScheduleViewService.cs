using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Middlewares;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.Services
{
    // Read-only schedule views for staff who are not managers: who is on duty today, and my own shifts
    public class ScheduleViewService : IScheduleViewService
    {
        private const int MaxRangeDays = 62;

        private readonly IWorkShiftRepository _workShiftRepository;
        private readonly IStaffRepository _staffRepository;
        private readonly ILeaveRequestRepository _leaveRequestRepository;

        public ScheduleViewService(
            IWorkShiftRepository workShiftRepository,
            IStaffRepository staffRepository,
            ILeaveRequestRepository leaveRequestRepository)
        {
            _workShiftRepository = workShiftRepository;
            _staffRepository = staffRepository;
            _leaveRequestRepository = leaveRequestRepository;
        }

        public async Task<List<DoctorOnDutyResponse>> GetDoctorsOnDutyAsync(
            DoctorsOnDutyQuery query,
            CancellationToken cancellationToken = default)
        {
            var date = query.Date ?? DateOnly.FromDateTime(ClinicClock.Today);
            var shifts = await _workShiftRepository.GetDoctorShiftsOnDateAsync(date);
            var leaves = await _leaveRequestRepository.GetApprovedOnDateAsync(date, cancellationToken);

            return shifts.Select(shift => new DoctorOnDutyResponse
            {
                DoctorId = shift.StaffProfileId,
                StaffUserId = shift.StaffProfile.UserId,
                DoctorName = shift.StaffProfile.FullName,
                Specialization = shift.StaffProfile.Specialization,
                ShiftId = shift.Id,
                RoomId = shift.RoomId,
                RoomName = shift.Room?.RoomName,
                ShiftStart = shift.ShiftStart,
                ShiftEnd = shift.ShiftEnd,
                ActualStartTime = shift.ActualStartTime,
                ActualEndTime = shift.ActualEndTime,
                Status = DutyStatusOf(shift, leaves)
            }).ToList();
        }

        public async Task<List<WorkShipResponse>> GetMyShiftsAsync(
            string userId,
            MyShiftsQuery query,
            CancellationToken cancellationToken = default)
        {
            var staff = await _staffRepository.GetByUserIdAsync(userId);
            ConditionGuard.Ensure<NotFoundException>(staff != null, ErrorConstants.ScheduleMessage.StaffProfileNotFound);

            var today = DateOnly.FromDateTime(ClinicClock.Today);
            var from = query.FromDate ?? StartOfWeek(today);
            var to = query.ToDate ?? from.AddDays(WorkShiftConstants.DaysInWeek * 2 - 1);
            ConditionGuard.Ensure(from <= to, ErrorConstants.ScheduleMessage.DateRangeInvalid);
            ConditionGuard.Ensure(to.DayNumber - from.DayNumber < MaxRangeDays, ErrorConstants.ScheduleMessage.DateRangeTooLarge);

            var shifts = await _workShiftRepository.GetAllAsync(from, to, userId, null);
            return shifts.Select(x => new WorkShipResponse
            {
                Id = x.Id,
                StaffUserId = x.StaffProfile.UserId,
                StaffName = x.StaffProfile.FullName,
                RoomId = x.RoomId,
                RoomName = x.Room?.RoomName,
                ScheduleDate = x.ScheduleDate,
                ShiftStart = x.ShiftStart,
                ShiftEnd = x.ShiftEnd,
                Assignment = x.Assignment,
                IsPresent = x.IsPresent,
                AbsenceReason = x.AbsenceReason,
                ActualStartTime = x.ActualStartTime,
                ActualEndTime = x.ActualEndTime,
                Notes = x.Notes,
                CreatedAt = x.CreatedAt
            }).ToList();
        }

        public static string SlotOf(TimeOnly shiftStart) =>
            shiftStart < LeaveRequestConstants.AfternoonStartsAt
                ? LeaveRequestConstants.SlotMorning
                : LeaveRequestConstants.SlotAfternoon;

        private static string DutyStatusOf(StaffSchedule shift, IEnumerable<LeaveRequest> approvedLeaves)
        {
            var onLeave = shift.IsPresent == false
                || approvedLeaves.Any(x => x.StaffProfileId == shift.StaffProfileId
                    && (x.Slot == null || x.Slot == SlotOf(shift.ShiftStart)));
            if (onLeave)
            {
                return DutyStatus.OnLeave;
            }

            if (shift.ActualEndTime.HasValue)
            {
                return DutyStatus.Ended;
            }

            return shift.ActualStartTime.HasValue ? DutyStatus.Working : DutyStatus.NotStarted;
        }

        private static DateOnly StartOfWeek(DateOnly date)
        {
            var daysSinceWeekStart = ((int)date.DayOfWeek - (int)WorkShiftConstants.WeekStartDay + WorkShiftConstants.DaysInWeek)
                                     % WorkShiftConstants.DaysInWeek;
            return date.AddDays(-daysSinceWeekStart);
        }
    }
}
