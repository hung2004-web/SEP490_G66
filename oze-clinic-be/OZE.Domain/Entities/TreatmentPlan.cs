namespace OZE.Domain.Entities
{
    public class TreatmentPlan
    {
        public long Id { get; set; }
        public long ExaminationId { get; set; }
        public int PatientId { get; set; }
        public int CreatedByDoctorId { get; set; }
        public int PlanVersion { get; set; } = 1;
        public string? PlanName { get; set; }
        public string? Description { get; set; }
        public int TotalStages { get; set; }
        public decimal EstimatedTotalCost { get; set; }
        public string Status { get; set; } = "Draft";
        public DateTimeOffset? ApprovedAt { get; set; }
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }

        public virtual Examination Examination { get; set; } = null!;
        public virtual Patient Patient { get; set; } = null!;
        public virtual StaffProfile CreatedByDoctor { get; set; } = null!;
        public virtual ICollection<TreatmentPlanStage> Stages { get; set; } = new List<TreatmentPlanStage>();
    }
}
