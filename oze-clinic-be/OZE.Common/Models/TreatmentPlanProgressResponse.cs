namespace OZE.Common.Models
{
    public class TreatmentPlanProgressResponse
    {
        public long TreatmentPlanId { get; set; }
        public string? PlanName { get; set; }
        public string Status { get; set; } = string.Empty;
        public int PlanVersion { get; set; }
        public int TotalStages { get; set; }
        public int CompletedStages { get; set; }
        public int CancelledStages { get; set; }
        /// <summary>
        /// BR-134: completed stages / stages that are not cancelled (0–100).
        /// </summary>
        public decimal ProgressPercent { get; set; }
        public List<TreatmentPlanStageResponse> Stages { get; set; } = new();
    }
}
