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
using System.Text.Json;
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
        private readonly IAuditLogRepository? _auditLogRepository;

        public DoctorScheduleService(IWorkShiftRepository workShiftRepository,
            IAppointmentRepository appointmentRepository,
            IStaffRepository staffRepository,
            IQueueService? queueService = null,
            IAuditLogService? auditLogService = null,
            IAuditLogRepository? auditLogRepository = null)
        {
            _auditLogRepository = auditLogRepository;
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
            // What the patients were before, kept in the log so the shift can be reopened
            var restorable = new List<RestorableAppointment>();
            // Someone who was already seen (e.g. back from the X-ray) is not "not examined"
            foreach (var appointment in open.Where(a => a.Examination == null && IsInShift(a, shift)))
            {
                if (appointment.Status == AppointmentConstants.CheckedInStatus || IsLate(appointment, nowTime))
                {
                    restorable.Add(new RestorableAppointment(appointment.Id, appointment.Status));
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
            await LogAsync(AuditConstants.ShiftEnded, shift.Id, new { shift.ActualEndTime, NoShow = restorable.Count, Restorable = restorable });
            return response;
        }

        public async Task<ReopenShiftResponse> ReopenShiftAsync(long shiftId)
        {
            var shift = await _workShiftRepository.GetByIdAsync(shiftId);
            ConditionGuard.Ensure<NotFoundException>(shift != null, ErrorConstants.DoctorScheduleMessage.ShiftNotFound);
            ConditionGuard.Ensure(shift!.ActualEndTime != null, ErrorConstants.DoctorScheduleMessage.ShiftNotEnded);

            // Only while the shift is still on: a morning shift cannot be taken back in the afternoon
            ConditionGuard.Ensure(shift.ScheduleDate == DateOnly.FromDateTime(DateTime.Today)
                && TimeOnly.FromDateTime(DateTime.Now) < shift.ShiftEnd, ErrorConstants.DoctorScheduleMessage.ShiftTimeOver);

            // The room belongs to whoever is working in it now; reopening never takes it from another doctor
            if (shift.RoomId.HasValue)
            {
                var roomInUse = await _workShiftRepository.HasRunningShiftInRoomAsync(shift.RoomId.Value, shift.ScheduleDate, shift.Id);
                ConditionGuard.ThrowIf(roomInUse, ErrorConstants.DoctorScheduleMessage.RoomInUse);
            }

            var response = new ReopenShiftResponse { ShiftId = shift.Id };
            foreach (var item in await GetRestorableAsync(shift.Id))
            {
                var appointment = await _appointmentRepository.GetByIdWithDetailsAsync(item.Id);
                // Only a patient still marked NO_SHOW by that end is taken back; anything else changed since
                if (appointment == null || appointment.Status != AppointmentConstants.NoShowStatus
                    || (item.Status != AppointmentConstants.CheckedInStatus && item.Status != AppointmentConstants.ConfirmedStatus))
                {
                    response.SkippedAppointmentIds.Add(item.Id);
                    continue;
                }

                appointment.Status = item.Status;
                appointment.UpdatedAt = DateTimeOffset.UtcNow;
                await _appointmentRepository.UpdateAsync(appointment);

                // A patient who was waiting goes back in the queue (with a new number, at the back of the same priority)
                if (item.Status == AppointmentConstants.CheckedInStatus && _queueService != null)
                {
                    await _queueService.EnqueueAsync(appointment.Id, QueueConstants.ExaminationType, shift.RoomId, appointment.DoctorId, appointment.Priority);
                }

                if (_auditLogService != null)
                {
                    await _auditLogService.LogAsync(AuditConstants.AppointmentNoShowReverted, AuditConstants.AppointmentEntity, appointment.Id.ToString(),
                        new { Status = AppointmentConstants.NoShowStatus }, new { appointment.Status }, ErrorConstants.DoctorScheduleMessage.ShiftReopenedReason);
                }
                response.RestoredAppointmentIds.Add(appointment.Id);
            }

            // Last, so a failure in between leaves the shift ended and reopening it again finishes the job
            shift.ActualEndTime = null;
            shift.UpdatedAt = DateTimeOffset.UtcNow;
            _workShiftRepository.Update(shift);
            await _workShiftRepository.SaveChangesAsync();

            await LogAsync(AuditConstants.ShiftReopened, shift.Id, new { Restored = response.RestoredAppointmentIds.Count });
            return response;
        }

        // The patients the last end of that shift marked NO_SHOW, with what they were before
        private async Task<List<RestorableAppointment>> GetRestorableAsync(long shiftId)
        {
            if (_auditLogRepository == null)
            {
                return new List<RestorableAppointment>();
            }

            var ended = await _auditLogRepository.GetLatestAsync(AuditConstants.ShiftEnded, AuditConstants.StaffScheduleEntity, shiftId.ToString());
            if (string.IsNullOrWhiteSpace(ended?.NewValues))
            {
                return new List<RestorableAppointment>();
            }

            try
            {
                var values = JsonSerializer.Deserialize<ShiftEndedValues>(ended.NewValues, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                return values?.Restorable ?? new List<RestorableAppointment>();
            }
            catch (JsonException)
            {
                return new List<RestorableAppointment>();
            }
        }

        private sealed record RestorableAppointment(long Id, string Status);

        private sealed record ShiftEndedValues(List<RestorableAppointment>? Restorable);

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
            var time = GetTimeInShift(appointment);
            return time.HasValue && time.Value >= shift.ShiftStart && time.Value < shift.ShiftEnd;
        }

        private static TimeOnly? GetTimeInShift(Appointment appointment)
        {
            return appointment.TimeSlotStart
                ?? (appointment.CheckInAt.HasValue ? TimeOnly.FromDateTime(appointment.CheckInAt.Value.LocalDateTime) : null);
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
            // Walk-ins have no booked time, they belong to the shift they checked in during (the same rule as ending the shift)
            var inShift = appointments
                .Where(a => a.AppointmentDate == shift.ScheduleDate && IsInShift(a, shift))
                .OrderBy(a => GetTimeInShift(a))
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
