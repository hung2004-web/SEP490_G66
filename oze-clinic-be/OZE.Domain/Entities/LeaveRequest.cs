namespace OZE.Domain.Entities
{
    // A staff member asks to be off for a day or half a day; the manager approves or rejects it
    public class LeaveRequest
    {
        public long Id { get; set; }
        public int StaffProfileId { get; set; }
        public DateOnly LeaveDate { get; set; }
        // Morning, Afternoon, or null for the whole day
        public string? Slot { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending";
        // Set on approval when another staff member takes over the shifts
        public int? SubstituteStaffProfileId { get; set; }
        public string? ReviewedByUserId { get; set; }
        public DateTimeOffset? ReviewedAt { get; set; }
        public string? RejectionReason { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }

        public virtual StaffProfile StaffProfile { get; set; } = null!;
        public virtual StaffProfile? SubstituteStaffProfile { get; set; }
    }
}
