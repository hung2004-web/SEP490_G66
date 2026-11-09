using System;

namespace OZE.Common.Models
{
    public class FollowUpSummaryResponse
    {
        public DateOnly? FollowUpDate { get; set; }
        public string? FollowUpNotes { get; set; }
        public string? Purpose => FollowUpNotes;
        public long? AppointmentId { get; set; }
        public string? AppointmentCode { get; set; }
        public DateOnly? AppointmentDate { get; set; }
        public TimeOnly? TimeSlotStart { get; set; }
        public TimeOnly? TimeSlotEnd { get; set; }
        public int? DoctorId { get; set; }
        public string? DoctorName { get; set; }
        public string? Status { get; set; }
        public DateTimeOffset? RemindedAt { get; set; }
        public int ReminderCount { get; set; }
    }
}
