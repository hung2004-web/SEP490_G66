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

        public DoctorScheduleService(IWorkShiftRepository workShiftRepository,
            IAppointmentRepository appointmentRepository,
            IStaffRepository staffRepository)
        {
            _workShiftRepository = workShiftRepository;
            _appointmentRepository = appointmentRepository;
            _staffRepository = staffRepository;
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
