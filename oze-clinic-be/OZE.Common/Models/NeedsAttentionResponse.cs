namespace OZE.Common.Models
{
    // A patient the front desk has to deal with because the doctor ended the shift: someone waiting in the clinic
    // (to be moved to another doctor) or someone booked for a time that is still to come (to be rescheduled)
    public class NeedsAttentionResponse
    {
        public long AppointmentId { get; set; }
        public int PatientId { get; set; }
        public string PatientCode { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        // The full number: the desk calls the patient
        public string PatientPhoneNumber { get; set; } = string.Empty;
        // BOOKED or WALK_IN
        public string AppointmentType { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        // WAITING (in the clinic) or UPCOMING (booked, has not come yet)
        public string Group { get; set; } = string.Empty;
        // Null for a walk-in
        public TimeOnly? TimeSlotStart { get; set; }
        public int? DoctorId { get; set; }
        public string? DoctorName { get; set; }
        // When the doctor ended the shift
        public TimeOnly? ShiftEndedAt { get; set; }
        // A waiting patient who was already seen (back from the X-ray) stays with the doctor of the examination
        public bool HasExamination { get; set; }
    }
}
