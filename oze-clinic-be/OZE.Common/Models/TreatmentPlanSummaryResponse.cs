namespace OZE.Common.Models
{
    public class TreatmentPlanSummaryResponse
    {
        public long Id { get; set; }
        public string? PlanName { get; set; }
        public string Status { get; set; } = string.Empty;
        public int TotalStages { get; set; }
        public decimal EstimatedTotalCost { get; set; }
    }
}
