namespace OZE.Domain.Entities
{
    public class ClinicalDiagnosis
    {
        public long Id { get; set; }
        public long ExaminationId { get; set; }
        public string? DiagnosisCode { get; set; }
        public string DiagnosisName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsPrimary { get; set; }
        public int DiagnosedByDoctorId { get; set; }
        public DateTimeOffset CreatedAt { get; set; }

        public virtual Examination Examination { get; set; } = null!;
        public virtual StaffProfile DiagnosedByDoctor { get; set; } = null!;
    }
}
