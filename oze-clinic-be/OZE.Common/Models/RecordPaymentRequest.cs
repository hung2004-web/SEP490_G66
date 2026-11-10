using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class RecordPaymentRequest
    {
        [Range(0.01, double.MaxValue)]
        public decimal Amount { get; set; }

        [Required]
        [MaxLength(20)]
        public string PaymentMethod { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Purpose { get; set; } = "Regular";

        [MaxLength(100)]
        public string? TransactionReference { get; set; }

        public long? InstallmentPeriodId { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }
    }

    public class PaymentResponse
    {
        public long Id { get; set; }
        public long InvoiceId { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string PaymentStatus { get; set; } = string.Empty;
        public string Purpose { get; set; } = string.Empty;
        public string? TransactionReference { get; set; }
        public long? InstallmentPeriodId { get; set; }
        public string? Notes { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? PaidAt { get; set; }
        public string? ConfirmedByUserId { get; set; }

        public decimal InvoicePaidAmount { get; set; }
        public decimal InvoiceRemainingAmount { get; set; }
        public string InvoicePaymentStatus { get; set; } = string.Empty;
    }
}
