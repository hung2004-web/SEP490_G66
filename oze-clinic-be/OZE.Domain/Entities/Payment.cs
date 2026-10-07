namespace OZE.Domain.Entities
{
    public class Payment
    {
        public long Id { get; set; }
        public long InvoiceId { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string? TransactionReference { get; set; }
        public string PaymentStatus { get; set; } = "PENDING";
        public DateTimeOffset? PaidAt { get; set; }
        public string? ConfirmedByUserId { get; set; }
        public string? Notes { get; set; }
        public DateTimeOffset CreatedAt { get; set; }

        public virtual Invoice Invoice { get; set; } = null!;
    }
}
