namespace OZE.Domain.Entities
{
    public class QueueEntry
    {
        public long Id { get; set; }
        public long AppointmentId { get; set; }
        public string QueueType { get; set; } = string.Empty;
        public int? RoomId { get; set; }
        public int? AssignedStaffId { get; set; }
        public int QueueNumber { get; set; }
        public int Priority { get; set; }
        public string Status { get; set; } = "WAITING";
        public DateTimeOffset? CalledAt { get; set; }
        public DateTimeOffset? StartedAt { get; set; }
        public DateTimeOffset? CompletedAt { get; set; }
        public string? Notes { get; set; }
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
        public DateTimeOffset CreatedAt { get; set; }

        public virtual Appointment Appointment { get; set; } = null!;
        public virtual Room? Room { get; set; }
        public virtual StaffProfile? AssignedStaff { get; set; }
    }
}
