namespace OZE.Domain.Entities
{
    public class Appointment
    {
        public long Id { get; set; }
        public int PatientId { get; set; }
        public int? DoctorId { get; set; }
        public string AppointmentType { get; set; } = string.Empty;
        public DateOnly AppointmentDate { get; set; }
        public TimeOnly? TimeSlotStart { get; set; }
        public TimeOnly? TimeSlotEnd { get; set; }
        public string Status { get; set; } = "PENDING";
        public DateTimeOffset? CheckInAt { get; set; }
        public string? Notes { get; set; }
        public string? CancellationReason { get; set; }
        public DateTimeOffset? CancelledAt { get; set; }
        public string? CancelledByUserId { get; set; }
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
        public DateTimeOffset CreatedAt { get; set; }
        public string? CreatedByUserId { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }

        public virtual Patient Patient { get; set; } = null!;
        public virtual StaffProfile? Doctor { get; set; }
        public virtual Examination? Examination { get; set; }
        public virtual ICollection<QueueEntry> QueueEntries { get; set; } = new List<QueueEntry>();
    }
}
