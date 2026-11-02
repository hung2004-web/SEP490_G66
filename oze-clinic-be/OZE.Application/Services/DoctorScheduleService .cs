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
    public class DoctorScheduleService : IDoctorScheduleService
    {
        private readonly IWorkShiftRepository _workShiftRepository;
        private readonly IAppointmentRepository _appointmentRepository;
        private readonly IStaffRepository _staffRepository;
        private readonly IQueueService? _queueService;
        private readonly IAuditLogService? _auditLogService;

        public DoctorScheduleService(IWorkShiftRepository workShiftRepository,
            IAppointmentRepository appointmentRepository,
            IStaffRepository staffRepository,
            IQueueService? queueService = null,
            IAuditLogService? auditLogService = null)
        {
            _workShiftRepository = workShiftRepository;
            _appointmentRepository = appointmentRepository;
            _staffRepository = staffRepository;
            _queueService = queueService;
            _auditLogService = auditLogService;
        }

       
        public async Task<List<DoctorShiftResponse>> GetMyScheduleAsync(string userId, DoctorScheduleQueryRequest query)
        {
            var doctor = await GetDoctorAsync(userId);

            var fromDate = query.FromDate ?? GetStartOfWeek(DateOnly.FromDateTime(DateTime.Today));
            var toDate = query.ToDate ?? fromDate.AddDays(WorkShiftConstants.DaysInWeek - 1);
            ConditionGuard.Ensure(fromDate <= toDate, ErrorConstants.DoctorScheduleMessage.InvalidDateRange);
            ConditionGuard.Ensure(toDate.DayNumber - fromDate.DayNumber < WorkShiftConstants.DaysInWeek,
                ErrorConstants.DoctorScheduleMessage.DateRangeTooLong);

            // AC4: filter by the signed-in user, never by an id from the client
            var shifts = await _workShiftRepository.GetAllAsync(fromDate, toDate, userId, null);
            var appointments = await _appointmentRepository.GetDoctorAppointmentsAsync(doctor.Id, fromDate, toDate);

            return shifts.Select(shift => ToResponse(shift, appointments)).ToList();
        }

       
        public async Task<DoctorShiftResponse> GetMyShiftDetailAsync(string userId, long shiftId)
        {
            var doctor = await GetDoctorAsync(userId);

            var shift = await _workShiftRepository.GetByIdAsync(shiftId);
            // Another doctor's shift returns 404 too, so its existence is not revealed
            ConditionGuard.Ensure<NotFoundException>(shift != null && shift.StaffProfileId == doctor.Id,
                ErrorConstants.DoctorScheduleMessage.ShiftNotFound);

            var appointments = await _appointmentRepository.GetDoctorAppointmentsAsync(
                doctor.Id, shift!.ScheduleDate, shift.ScheduleDate);
            return ToResponse(shift, appointments);
        }

        public async Task<DoctorShiftResponse> StartShiftAsync(string userId, long shiftId)
        {
            var (doctor, shift) = await GetOwnShiftOfTodayAsync(userId, shiftId);
            ConditionGuard.Ensure(shift.ActualStartTime == null, ErrorConstants.DoctorScheduleMessage.ShiftAlreadyStarted);

            shift.IsPresent = true;
            shift.AbsenceReason = null;
            shift.ActualStartTime = TimeOnly.FromDateTime(DateTime.Now);
            shift.UpdatedAt = DateTimeOffset.UtcNow;
            _workShiftRepository.Update(shift);
            await _workShiftRepository.SaveChangesAsync();

            await LogAsync(AuditConstants.ShiftStarted, shift.Id, new { shift.ActualStartTime });

            var appointments = await _appointmentRepository.GetDoctorAppointmentsAsync(doctor.Id, shift.ScheduleDate, shift.ScheduleDate);
            return ToResponse(shift, appointments);
        }

        public async Task<EndShiftResponse> EndShiftAsync(string userId, long shiftId)
        {
            var (doctor, shift) = await GetOwnShiftOfTodayAsync(userId, shiftId);
            ConditionGuard.Ensure(shift.ActualStartTime != null, ErrorConstants.DoctorScheduleMessage.ShiftNotStarted);
            ConditionGuard.Ensure(shift.ActualEndTime == null, ErrorConstants.DoctorScheduleMessage.ShiftAlreadyEnded);

            var now = DateTime.Now;
            var nowTime = TimeOnly.FromDateTime(now);
            var open = await _appointmentRepository.GetDoctorOpenAppointmentsAsync(doctor.Id, shift.ScheduleDate);

            // A patient is still with the doctor: the examination is finished first
            ConditionGuard.Ensure(open.All(a => a.Status != AppointmentConstants.InServiceStatus),
                ErrorConstants.DoctorScheduleMessage.ExaminationStillRunning);

            var response = new EndShiftResponse { ShiftId = shift.Id, ActualStartTime = shift.ActualStartTime };
            // Someone who was already seen (e.g. back from the X-ray) is not "not examined"
            foreach (var appointment in open.Where(a => a.Examination == null && IsInShift(a, shift)))
            {
                if (appointment.Status == AppointmentConstants.CheckedInStatus || IsLate(appointment, nowTime))
                {
                    await MarkNoShowAsync(appointment);
                    response.NoShowAppointmentIds.Add(appointment.Id);
                }
                else
                {
                    response.UpcomingAppointmentIds.Add(appointment.Id);
                }
            }

            // Last, so a failure in between leaves the shift open and ending it again finishes the job
            shift.ActualEndTime = nowTime;
            shift.UpdatedAt = DateTimeOffset.UtcNow;
            _workShiftRepository.Update(shift);
            await _workShiftRepository.SaveChangesAsync();

            response.ActualEndTime = shift.ActualEndTime;
            await LogAsync(AuditConstants.ShiftEnded, shift.Id, new { shift.ActualEndTime, NoShow = response.NoShowAppointmentIds.Count });
            return response;
        }

        private async Task<(StaffProfile Doctor, StaffSchedule Shift)> GetOwnShiftOfTodayAsync(string userId, long shiftId)
        {
            var doctor = await GetDoctorAsync(userId);
            var shift = await _workShiftRepository.GetByIdAsync(shiftId);
            // Another doctor's shift returns 404 too, so its existence is not revealed
            ConditionGuard.Ensure<NotFoundException>(shift != null && shift.StaffProfileId == doctor.Id,
                ErrorConstants.DoctorScheduleMessage.ShiftNotFound);
            ConditionGuard.Ensure(shift!.ScheduleDate == DateOnly.FromDateTime(DateTime.Today), ErrorConstants.DoctorScheduleMessage.ShiftNotToday);
            return (doctor, shift);
        }

        // Booked patients are placed by their time slot, walk-ins (no slot) by the time they checked in
        private static bool IsInShift(Appointment appointment, StaffSchedule shift)
        {
            TimeOnly? time = appointment.TimeSlotStart
                ?? (appointment.CheckInAt.HasValue ? TimeOnly.FromDateTime(appointment.CheckInAt.Value.LocalDateTime) : null);
            return time.HasValue && time.Value >= shift.ShiftStart && time.Value < shift.ShiftEnd;
        }

        // A booked patient who never came and whose slot has already started
        private static bool IsLate(Appointment appointment, TimeOnly now)
        {
            return appointment.Status == AppointmentConstants.ConfirmedStatus
                && appointment.TimeSlotStart.HasValue
                && appointment.TimeSlotStart.Value <= now;
        }

        private async Task MarkNoShowAsync(Appointment appointment)
        {
            var oldStatus = appointment.Status;
            appointment.Status = AppointmentConstants.NoShowStatus;
            appointment.UpdatedAt = DateTimeOffset.UtcNow;
            await _appointmentRepository.UpdateAsync(appointment);

            // A patient who was waiting leaves the queue board
            if (oldStatus == AppointmentConstants.CheckedInStatus && _queueService != null)
            {
                await _queueService.UpdateStatusAsync(appointment.Id, QueueConstants.ExaminationType, QueueConstants.Cancelled);
            }

            if (_auditLogService != null)
            {
                await _auditLogService.LogAsync(AuditConstants.AppointmentNoShow, AuditConstants.AppointmentEntity, appointment.Id.ToString(),
                    new { Status = oldStatus }, new { appointment.Status }, ErrorConstants.DoctorScheduleMessage.NoShowReason);
            }
        }

        private Task LogAsync(string action, long shiftId, object values)
        {
            return _auditLogService?.LogAsync(action, AuditConstants.StaffScheduleEntity, shiftId.ToString(), null, values) ?? Task.CompletedTask;
        }

        private async Task<StaffProfile> GetDoctorAsync(string userId)
        {
            var doctor = await _staffRepository.GetByUserIdAsync(userId);
            ConditionGuard.Ensure<NotFoundException>(doctor != null, ErrorConstants.DoctorScheduleMessage.DoctorNotFound);
            return doctor!;
        }

      
        private static DoctorShiftResponse ToResponse(StaffSchedule shift, List<Appointment> appointments)
        {
            var inShift = appointments
                .Where(a => a.AppointmentDate == shift.ScheduleDate
                    && a.TimeSlotStart.HasValue
                    && a.TimeSlotStart.Value >= shift.ShiftStart
                    && a.TimeSlotStart.Value < shift.ShiftEnd)
                .Select(a => new DoctorAppointmentResponse
                {
                    Id = a.Id,
                    PatientId = a.PatientId,
                    PatientCode = a.Patient.PatientCode,
                    PatientName = a.Patient.FullName,
                    AppointmentType = a.AppointmentType,
                    TimeSlotStart = a.TimeSlotStart,
                    TimeSlotEnd = a.TimeSlotEnd,
                    Status = a.Status,
                    Notes = a.Notes
                })
                .ToList();

            return new DoctorShiftResponse
            {
                Id = shift.Id,
                ScheduleDate = shift.ScheduleDate,
                ShiftStart = shift.ShiftStart,
                ShiftEnd = shift.ShiftEnd,
                RoomId = shift.RoomId,
                RoomName = shift.Room?.RoomName,
                Assignment = shift.Assignment,
                IsPresent = shift.IsPresent,
                AbsenceReason = shift.AbsenceReason,
                ActualStartTime = shift.ActualStartTime,
                ActualEndTime = shift.ActualEndTime,
                AppointmentCount = inShift.Count,
                Appointments = inShift
            };
        }

        private static DateOnly GetStartOfWeek(DateOnly date)
        {
            var diff = ((int)date.DayOfWeek - (int)WorkShiftConstants.WeekStartDay + WorkShiftConstants.DaysInWeek)
                       % WorkShiftConstants.DaysInWeek;
            return date.AddDays(-diff);
        }
    }
}
