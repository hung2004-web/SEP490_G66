using OZE.Application.Interfaces;
using OZE.Application.Middlewares;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Application.Services
{
    public class WorkShiftService : IWorkShipService
    {
        private readonly IWorkShiftRepository _workShipRepository;
        private readonly IStaffRepository _staffRepository;
        private readonly IRoomRepository _roomRepository;

        public WorkShiftService(IWorkShiftRepository workShipRepository, IStaffRepository staffRepository, IRoomRepository roomRepository)
        {
            _workShipRepository = workShipRepository;
            _staffRepository = staffRepository;
            _roomRepository = roomRepository;
        }

        public async Task<WorkShipResponse> CreateWorkShipAsync(CreateWorkShiftRequest request)
        {
            // [Required] has already rejected missing values, so .Value is safe here
            var scheduleDate = request.ScheduleDate!.Value;
            var shiftStart = request.ShiftStart!.Value;
            var shiftEnd = request.ShiftEnd!.Value;

            ConditionGuard.Ensure(shiftStart < shiftEnd, ErrorConstants.WorkShiftMessage.InvalidTimeRange);
            ConditionGuard.Ensure(scheduleDate >= DateOnly.FromDateTime(DateTime.Today), ErrorConstants.WorkShiftMessage.PastDate);

            var staff = await _staffRepository.GetByUserIdAsync(request.StaffUserId);
            ConditionGuard.Ensure<NotFoundException>(staff != null, ErrorConstants.WorkShiftMessage.StaffNotFound);
            ConditionGuard.Ensure(staff!.IsActive, ErrorConstants.WorkShiftMessage.StaffInactive);

            Room? room = null;
            if (request.RoomId.HasValue)
            {
                room = await _roomRepository.GetByIdAsync(request.RoomId.Value);
                ConditionGuard.Ensure<NotFoundException>(room != null, ErrorConstants.WorkShiftMessage.RoomNotFound);
                ConditionGuard.Ensure(room!.Status == RoomConstants.ActiveStatus, ErrorConstants.WorkShiftMessage.RoomNotActive);
            }

            var hasOverlap = await _workShipRepository.HasOverlapAsync(staff.Id, scheduleDate, shiftStart, shiftEnd);
            ConditionGuard.ThrowIf(hasOverlap, ErrorConstants.WorkShiftMessage.ShiftOverlap);

            var schedule = new StaffSchedule
            {
                StaffProfileId = staff.Id,
                RoomId = request.RoomId,
                ScheduleDate = scheduleDate,
                ShiftStart = shiftStart,
                ShiftEnd = shiftEnd,
                Assignment = request.Assignment?.Trim(),
                Notes = request.Note?.Trim(),
                CreatedAt = DateTimeOffset.UtcNow
            };

            await _workShipRepository.AddAsync(schedule);
            await _workShipRepository.SaveChangesAsync();

            return ToResponse(schedule, staff, room);
        }

        private static WorkShipResponse ToResponse(StaffSchedule schedule, StaffProfile staff, Room? room)
        {
            return new WorkShipResponse
            {
                Id = schedule.Id,
                StaffUserId = staff.UserId,
                StaffName = staff.FullName,
                RoomId = schedule.RoomId,
                RoomName = room?.RoomName,
                ScheduleDate = schedule.ScheduleDate,
                ShiftStart = schedule.ShiftStart,
                ShiftEnd = schedule.ShiftEnd,
                Assignment = schedule.Assignment,
                IsPresent = schedule.IsPresent,
                AbsenceReason = schedule.AbsenceReason,
                Notes = schedule.Notes,
                CreatedAt = schedule.CreatedAt
            };
        }

        public async Task<List<WorkShipResponse>> GetWorkShiftsAsync(WorkShiftQueryRequest query)
        {
            var fromDate = query.FromDate ?? GetStartOfWeek(DateOnly.FromDateTime(DateTime.Today));
            var toDate = query.ToDate ?? fromDate.AddDays(WorkShiftConstants.DaysInWeek - 1);

            ConditionGuard.Ensure(fromDate <= toDate, ErrorConstants.WorkShiftMessage.InvalidDateRange);

            var shifts = await _workShipRepository.GetAllAsync(fromDate, toDate, query.StaffUserId, query.RoomId);
            return shifts.Select(x => ToResponse(x, x.StaffProfile, x.Room)).ToList();
        }

        public async Task<WorkShipResponse> GetWorkShiftByIdAsync(long id)
        {   
            var shift = await _workShipRepository.GetByIdAsync(id);
            ConditionGuard.Ensure<NotFoundException>(shift != null, ErrorConstants.WorkShiftMessage.WorkShiftNotFound);
            return ToResponse(shift!, shift!.StaffProfile, shift.Room);
        }
        private static DateOnly GetStartOfWeek(DateOnly date)
        {
            var daysSinceWeekStart = ((int)date.DayOfWeek - (int)WorkShiftConstants.WeekStartDay + WorkShiftConstants.DaysInWeek)
                                     % WorkShiftConstants.DaysInWeek;
            return date.AddDays(-daysSinceWeekStart);
        }
    }
}

