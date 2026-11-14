namespace OZE.Common.Models
{
    // A PENDING appointment the front desk has to call about: it waited too long for confirmation or the visit is close
    public class PendingOverdueResponse
    {
        public long AppointmentId { get; set; }
        public int PatientId { get; set; }
        public string PatientCode { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        // The full number: the desk calls the patient
        public string PatientPhoneNumber { get; set; } = string.Empty;
        public DateOnly AppointmentDate { get; set; }
        public TimeOnly? TimeSlotStart { get; set; }
        public int? DoctorId { get; set; }
        public string? DoctorName { get; set; }
        // When the appointment went to PENDING: booked, or last rescheduled by the patient
        public DateTimeOffset PendingSince { get; set; }
        // Clinic time by which the desk should have confirmed: the earlier of "pending for too long" and "too close to the visit"
        public DateTime ConfirmDeadline { get; set; }
        public int PendingHours { get; set; }
        // Negative when the visit time has already passed
        public int HoursUntilVisit { get; set; }
        // VISIT_SOON or WAITING_TOO_LONG (VISIT_SOON wins when both apply)
        public string Reason { get; set; } = string.Empty;
    }
}
