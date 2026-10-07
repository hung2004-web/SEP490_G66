namespace OZE.Domain.Entities
{
    public class InvoiceItem
    {
        public long Id { get; set; }
        public long InvoiceId { get; set; }
        public int? ServiceId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal UnitPrice { get; set; }
        public int Quantity { get; set; } = 1;
        public decimal Amount { get; set; }
        public long? TreatmentPlanStageId { get; set; }
        public int SortOrder { get; set; }

        public virtual Invoice Invoice { get; set; } = null!;
        public virtual Service? Service { get; set; }
        public virtual TreatmentPlanStage? TreatmentPlanStage { get; set; }
    }
}
