namespace OZE.Domain.Entities
{
    public class RefundAdjustmentRequest
    {
        public long Id { get; set; }
        public long InvoiceId { get; set; }
        public long? PaymentId { get; set; }
        public string RequestType { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending";
        public string RequestedByUserId { get; set; } = string.Empty;
        public string? ApprovedByUserId { get; set; }
        public DateTimeOffset? ApprovedAt { get; set; }
        public string? RejectionReason { get; set; }
        public DateTimeOffset? ProcessedAt { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }

        public virtual Invoice Invoice { get; set; } = null!;
        public virtual Payment? Payment { get; set; }
    }
}
