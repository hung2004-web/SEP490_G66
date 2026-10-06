namespace OZE.Domain.Entities
{
    public class PatientMedicalProfile
    {
        public long Id { get; set; }
        public int PatientId { get; set; }
        public string RecordType { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Severity { get; set; }
        public string Status { get; set; } = "Active";
        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public string? CreatedByUserId { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }

        public virtual Patient Patient { get; set; } = null!;
    }
}
