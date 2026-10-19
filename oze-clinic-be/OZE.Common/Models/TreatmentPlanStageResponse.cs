namespace OZE.Common.Models
{
    public class TreatmentPlanStageResponse
    {
        public long Id { get; set; }
        public int StageNumber { get; set; }
        public string? StageName { get; set; }
        public string? Description { get; set; }
        public int? ServiceId { get; set; }
        public string? ServiceName { get; set; }
        public decimal EstimatedCost { get; set; }
        public decimal? ActualCost { get; set; }
        public string StageStatus { get; set; } = string.Empty;
        public DateOnly? ScheduledDate { get; set; }
        public DateOnly? ActualDate { get; set; }
        public int? PerformedByDoctorId { get; set; }
        public string? Notes { get; set; }
        public DateTimeOffset? CompletedAt { get; set; }
    }
}
