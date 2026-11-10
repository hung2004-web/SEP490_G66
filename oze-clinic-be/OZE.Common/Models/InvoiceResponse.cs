namespace OZE.Common.Models
{
    public class InvoiceSummaryResponse
    {
        public long Id { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public int PatientId { get; set; }
        public string? PatientName { get; set; }
        public long? AppointmentId { get; set; }
        public long? TreatmentPlanId { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal FinalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal RemainingAmount { get; set; }
        public string PaymentStatus { get; set; } = string.Empty;
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? CancelledAt { get; set; }
    }

    public class InvoiceResponse
    {
        public long Id { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public int PatientId { get; set; }
        public string? PatientName { get; set; }
        public long? AppointmentId { get; set; }
        public long? TreatmentPlanId { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal FinalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal RemainingAmount { get; set; }
        public string PaymentStatus { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public string? CreatedByUserId { get; set; }
        public DateTimeOffset? CancelledAt { get; set; }
        public List<InvoiceItemResponse> Items { get; set; } = new();
        public List<InvoicePaymentSummaryResponse> Payments { get; set; } = new();
    }

    public class InvoiceItemResponse
    {
        public long Id { get; set; }
        public int? ServiceId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal UnitPrice { get; set; }
        public int Quantity { get; set; }
        public decimal Amount { get; set; }
        public long? TreatmentPlanStageId { get; set; }
        public int SortOrder { get; set; }
    }

    public class InvoicePaymentSummaryResponse
    {
        public long Id { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string PaymentStatus { get; set; } = string.Empty;
        public string Purpose { get; set; } = string.Empty;
        public string? TransactionReference { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? PaidAt { get; set; }
    }
}
