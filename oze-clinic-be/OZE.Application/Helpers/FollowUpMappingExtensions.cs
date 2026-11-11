using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.Application.Helpers
{
    /// <summary>
    /// Extension methods for mapping follow-up examination entities to response models.
    /// </summary>
    public static class FollowUpMappingExtensions
    {
        /// <summary>
        /// Projects an Examination entity to a FollowUpSummaryResponse, or null if no follow-up is planned.
        /// </summary>
        public static FollowUpSummaryResponse? ToFollowUpSummary(this Examination? examination)
        {
            if (examination == null || (examination.FollowUpDate == null && examination.FollowUpAppointmentId == null))
            {
                return null;
            }

            var followUpAppt = examination.FollowUpAppointment;
            return new FollowUpSummaryResponse
            {
                FollowUpDate = examination.FollowUpDate,
                FollowUpNotes = examination.FollowUpNotes,
                AppointmentId = examination.FollowUpAppointmentId,
                AppointmentCode = followUpAppt != null ? $"LH{followUpAppt.Id:D6}" : null,
                AppointmentDate = followUpAppt?.AppointmentDate,
                TimeSlotStart = followUpAppt?.TimeSlotStart,
                TimeSlotEnd = followUpAppt?.TimeSlotEnd,
                DoctorId = followUpAppt?.DoctorId,
                DoctorName = followUpAppt?.Doctor?.FullName,
                Status = followUpAppt?.Status,
                RemindedAt = examination.FollowUpRemindedAt,
                ReminderCount = examination.FollowUpReminderCount
            };
        }

        /// <summary>
        /// Projects an Examination entity to a FollowUpListItemResponse for receptionist and doctor listings.
        /// </summary>
        public static FollowUpListItemResponse ToFollowUpListItem(this Examination x)
        {
            return new FollowUpListItemResponse
            {
                ExaminationId = x.Id,
                OriginalAppointmentId = x.AppointmentId,
                OriginalAppointmentCode = $"LH{x.AppointmentId:D6}",
                OriginalAppointmentDate = x.Appointment?.AppointmentDate ?? DateOnly.MinValue,
                PatientId = x.PatientId,
                PatientCode = x.Patient?.PatientCode ?? string.Empty,
                PatientName = x.Patient?.FullName ?? string.Empty,
                PatientPhoneNumber = x.Patient?.PhoneNumber ?? string.Empty,
                DoctorId = x.DoctorId,
                DoctorName = x.Doctor?.FullName ?? string.Empty,
                FollowUpDate = x.FollowUpDate,
                FollowUpNotes = x.FollowUpNotes,
                FollowUpAppointmentId = x.FollowUpAppointmentId,
                FollowUpAppointmentCode = x.FollowUpAppointment != null ? $"LH{x.FollowUpAppointment.Id:D6}" : null,
                FollowUpAppointmentDate = x.FollowUpAppointment?.AppointmentDate,
                FollowUpTimeSlotStart = x.FollowUpAppointment?.TimeSlotStart,
                FollowUpAppointmentStatus = x.FollowUpAppointment?.Status,
                LastRemindedAt = x.FollowUpRemindedAt,
                ReminderCount = x.FollowUpReminderCount
            };
        }
        public static FollowUpListItemResponse CheckToFollowUpListItem(this Examination x)
        {
            return new FollowUpListItemResponse
            {
                ExaminationId = x.Id,
                OriginalAppointmentId = x.AppointmentId,
                OriginalAppointmentCode = $"LH{x.AppointmentId:D6}",
                OriginalAppointmentDate = x.Appointment?.AppointmentDate ?? DateOnly.MinValue,
                PatientId = x.PatientId,
                PatientCode = x.Patient?.PatientCode ?? string.Empty,
                PatientName = x.Patient?.FullName ?? string.Empty,
                PatientPhoneNumber = x.Patient?.PhoneNumber ?? string.Empty,
                DoctorId = x.DoctorId,
                DoctorName = x.Doctor?.FullName ?? string.Empty,
                FollowUpDate = x.FollowUpDate,
                FollowUpNotes = x.FollowUpNotes,
                FollowUpAppointmentId = x.FollowUpAppointmentId,
                FollowUpAppointmentCode = x.FollowUpAppointment != null ? $"LH{x.FollowUpAppointment.Id:D6}" : null,
                FollowUpAppointmentDate = x.FollowUpAppointment?.AppointmentDate,
                FollowUpTimeSlotStart = x.FollowUpAppointment?.TimeSlotStart,
                FollowUpAppointmentStatus = x.FollowUpAppointment?.Status,
                LastRemindedAt = x.FollowUpRemindedAt,
                ReminderCount = x.FollowUpReminderCount
            };
        }
    }
}
