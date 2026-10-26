namespace OZE.Common.Models
{
    public class UpdateTreatmentStageRequest
    {
        public string? Notes { get; set; }
        public decimal? ActualCost { get; set; }
        public DateOnly? NextStageScheduledDate { get; set; }
    }
}
