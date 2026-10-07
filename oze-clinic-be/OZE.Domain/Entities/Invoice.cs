namespace OZE.Domain.Entities
{
    public class Invoice
    {
        public long Id { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public long? AppointmentId { get; set; }
        public int PatientId { get; set; }
        public long? TreatmentPlanId { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal FinalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public string PaymentStatus { get; set; } = "UNPAID";
        public string? Notes { get; set; }
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
        public DateTimeOffset CreatedAt { get; set; }
        public string? CreatedByUserId { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }
        public DateTimeOffset? CancelledAt { get; set; }

        public virtual Appointment? Appointment { get; set; }
        public virtual Patient Patient { get; set; } = null!;
        public virtual TreatmentPlan? TreatmentPlan { get; set; }
        public virtual ICollection<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();
        public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
        public virtual ICollection<RefundAdjustmentRequest> RefundAdjustmentRequests { get; set; } = new List<RefundAdjustmentRequest>();
    }
}
