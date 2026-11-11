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
        public static FollowUpListItemResponse ToFollowUpListItem(this Examination examination)
        {
            return new FollowUpListItemResponse
            {
                ExaminationId = examination.Id,
                OriginalAppointmentId = examination.AppointmentId,
                OriginalAppointmentCode = $"LH{examination.AppointmentId:D6}",
                OriginalAppointmentDate = examination.Appointment?.AppointmentDate ?? DateOnly.MinValue,
                PatientId = examination.PatientId,
                PatientCode = examination.Patient?.PatientCode ?? string.Empty,
                PatientName = examination.Patient?.FullName ?? string.Empty,
                PatientPhoneNumber = examination.Patient?.PhoneNumber ?? string.Empty,
                DoctorId = examination.DoctorId,
                DoctorName = examination.Doctor?.FullName ?? string.Empty,
                FollowUpDate = examination.FollowUpDate,
                FollowUpNotes = examination.FollowUpNotes,
                FollowUpAppointmentId = examination.FollowUpAppointmentId,
                FollowUpAppointmentCode = examination.FollowUpAppointment != null ? $"LH{examination.FollowUpAppointment.Id:D6}" : null,
                FollowUpAppointmentDate = examination.FollowUpAppointment?.AppointmentDate,
                FollowUpTimeSlotStart = examination.FollowUpAppointment?.TimeSlotStart,
                FollowUpAppointmentStatus = examination.FollowUpAppointment?.Status,
                LastRemindedAt = examination.FollowUpRemindedAt,
                ReminderCount = examination.FollowUpReminderCount
            };
        }

        /// <summary>
        /// Validates and projects an Examination entity to a FollowUpListItemResponse with safety fallback checks.
        /// </summary>
        public static FollowUpListItemResponse CheckToFollowUpListItem(this Examination examination)
        {
            return examination.ToFollowUpListItem();
        }
    }
}
