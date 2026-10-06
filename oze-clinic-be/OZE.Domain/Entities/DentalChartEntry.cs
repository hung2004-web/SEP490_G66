namespace OZE.Domain.Entities
{
    public class DentalChartEntry
    {
        public long Id { get; set; }
        public long ExaminationId { get; set; }
        public int PatientId { get; set; }
        public string ToothNumber { get; set; } = string.Empty;
        public string? Surface { get; set; }
        public string Condition { get; set; } = string.Empty;
        public string? Severity { get; set; }
        public string? Notes { get; set; }
        public DateTimeOffset CreatedAt { get; set; }

        public virtual Examination Examination { get; set; } = null!;
        public virtual Patient Patient { get; set; } = null!;
    }
}
