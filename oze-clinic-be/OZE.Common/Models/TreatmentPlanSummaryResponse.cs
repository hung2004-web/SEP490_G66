namespace OZE.Common.Models
{
    public class TreatmentPlanSummaryResponse
    {
        public long Id { get; set; }
        public string? PlanName { get; set; }
        public string Status { get; set; } = string.Empty;
        public int TotalStages { get; set; }
        public decimal EstimatedTotalCost { get; set; }
        public int CompletedStages { get; set; }
        public int CancelledStages { get; set; }
        public decimal ProgressPercent { get; set; }
        public string? NextStageName { get; set; }
        public DateOnly? NextStageScheduledDate { get; set; }
        public string? CreatedByDoctorName { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }
}
