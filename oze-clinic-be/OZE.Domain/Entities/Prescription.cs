namespace OZE.Domain.Entities
{
    public class Prescription
    {
        public long Id { get; set; }
        public long ExaminationId { get; set; }
        public int PatientId { get; set; }
        public int PrescribedByDoctorId { get; set; }
        public string? Notes { get; set; }
        public string Status { get; set; } = "Draft";
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }

        public virtual Examination Examination { get; set; } = null!;
        public virtual Patient Patient { get; set; } = null!;
        public virtual StaffProfile PrescribedByDoctor { get; set; } = null!;
        public virtual ICollection<PrescriptionItem> Items { get; set; } = new List<PrescriptionItem>();
    }
}
