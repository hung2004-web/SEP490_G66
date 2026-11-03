namespace OZE.Common.Models
{
    public class WaitingListItemResponse
    {
        // 1 is the next patient to be seen
        public int Position { get; set; }
        public long AppointmentId { get; set; }
        public int PatientId { get; set; }
        public string PatientCode { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public int? DoctorId { get; set; }
        public string? DoctorName { get; set; }
        // BOOKED or WALK_IN
        public string AppointmentType { get; set; } = string.Empty;
        // Null for a walk-in, who has no booked time
        public TimeOnly? TimeSlotStart { get; set; }
        public DateTimeOffset? CheckInAt { get; set; }
        // The room the patient was sent to at check-in
        public int? RoomId { get; set; }
        public string? RoomName { get; set; }
        // 0 normal, 1 high, 2 urgent; a higher level is seen first
        public int Priority { get; set; }
        // A booked patient who checked in after the allowed delay; a walk-in is never "late"
        public bool IsLate { get; set; }
        // True if the patient has finished imaging and returned to the doctor's priority queue
        public bool IsPriorityReturn { get; set; }
        public List<string> Services { get; set; } = new();
    }
}
