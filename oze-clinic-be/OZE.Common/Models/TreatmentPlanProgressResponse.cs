namespace OZE.Common.Models
{
    public class TreatmentPlanProgressResponse
    {
        public long TreatmentPlanId { get; set; }
        public string? PlanName { get; set; }
        public string Status { get; set; } = string.Empty;
        public int PlanVersion { get; set; }
        public string? Description { get; set; }
        public long ExaminationId { get; set; }
        public int PatientId { get; set; }
        public string? PatientName { get; set; }
        public int CreatedByDoctorId { get; set; }
        public string? CreatedByDoctorName { get; set; }
        public decimal EstimatedTotalCost { get; set; }
        // What the completed stages cost: the actual cost, or the estimate when none was entered
        public decimal CompletedCost { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? ApprovedAt { get; set; }
        public int TotalStages { get; set; }
        public int CompletedStages { get; set; }
        public int CancelledStages { get; set; }
        /// <summary>
        /// BR-134: completed stages / stages that are not cancelled (0–100).
        /// </summary>
        public decimal ProgressPercent { get; set; }
        // The stage in progress, otherwise the first scheduled one; null when nothing is left to do
        public TreatmentPlanStageResponse? NextStage { get; set; }
        public List<TreatmentPlanStageResponse> Stages { get; set; } = new();
    }
}
