namespace OZE.Domain.Entities
{
    public class StaffProfile
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public DateOnly? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? Specialization { get; set; }
        public string? LicenseNumber { get; set; }
        public DateOnly? HireDate { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }

        public virtual ApplicationUser User { get; set; } = null!;
        public virtual ICollection<StaffSchedule> Schedules { get; set; } = new List<StaffSchedule>();
    }
}
