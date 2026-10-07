namespace OZE.Domain.Entities
{
    public class TreatmentPlanStage
    {
        public long Id { get; set; }
        public long TreatmentPlanId { get; set; }
        public int StageNumber { get; set; }
        public string? StageName { get; set; }
        public string? Description { get; set; }
        public int? ServiceId { get; set; }
        public decimal EstimatedCost { get; set; }
        public decimal? ActualCost { get; set; }
        public string StageStatus { get; set; } = "Planned";
        public DateOnly? ScheduledDate { get; set; }
        public DateOnly? ActualDate { get; set; }
        public int? PerformedByDoctorId { get; set; }
        public string? Notes { get; set; }
        public DateTimeOffset? CompletedAt { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }

        public virtual TreatmentPlan TreatmentPlan { get; set; } = null!;
        public virtual Service? Service { get; set; }
        public virtual StaffProfile? PerformedByDoctor { get; set; }
    }
}
