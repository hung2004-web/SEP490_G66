namespace OZE.Domain.Entities
{
    public class StaffSchedule
    {
        public long Id { get; set; }
        public int StaffProfileId { get; set; }
        public int? RoomId { get; set; }
        public DateOnly ScheduleDate { get; set; }
        public TimeOnly ShiftStart { get; set; }
        public TimeOnly ShiftEnd { get; set; }
        public string? Assignment { get; set; }
        public bool? IsPresent { get; set; }
        public string? AbsenceReason { get; set; }
        public TimeOnly? ActualStartTime { get; set; }
        public TimeOnly? ActualEndTime { get; set; }
        public string? Notes { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }

        public virtual StaffProfile StaffProfile { get; set; } = null!;
        public virtual Room? Room { get; set; }
    }
}
