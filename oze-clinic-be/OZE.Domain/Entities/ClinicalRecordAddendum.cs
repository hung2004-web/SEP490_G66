namespace OZE.Domain.Entities
{
    public class ClinicalRecordAddendum
    {
        public long Id { get; set; }
        public long ExaminationId { get; set; }
        public string AddendumType { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? OriginalContent { get; set; }
        public int CreatedByDoctorId { get; set; }
        public DateTimeOffset CreatedAt { get; set; }

        public virtual Examination Examination { get; set; } = null!;
        public virtual StaffProfile CreatedByDoctor { get; set; } = null!;
    }
}
