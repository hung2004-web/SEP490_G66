using System;

namespace OZE.Common.Models
{
    public class FollowUpListItemResponse
    {
        public long ExaminationId { get; set; }
        public long OriginalAppointmentId { get; set; }
        public string OriginalAppointmentCode { get; set; } = string.Empty;
        public DateOnly OriginalAppointmentDate { get; set; }
        public int PatientId { get; set; }
        public string PatientCode { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public string PatientPhoneNumber { get; set; } = string.Empty;
        public int DoctorId { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public DateOnly? FollowUpDate { get; set; }
        public string? FollowUpNotes { get; set; }
        public long? FollowUpAppointmentId { get; set; }
        public string? FollowUpAppointmentCode { get; set; }
        public DateOnly? FollowUpAppointmentDate { get; set; }
        public TimeOnly? FollowUpTimeSlotStart { get; set; }
        public string? FollowUpAppointmentStatus { get; set; }
        public DateTimeOffset? LastRemindedAt { get; set; }
        public int ReminderCount { get; set; }
    }
}
