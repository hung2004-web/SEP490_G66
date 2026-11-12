using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class CreateRefundRequest
    {
        [Required]
        [MaxLength(1000)]
        public string Reason { get; set; } = string.Empty;

        public long? PaymentId { get; set; }
    }

    public class SetWorkDoneAmountRequest
    {
        [Range(0, double.MaxValue)]
        public decimal WorkDoneAmount { get; set; }
    }

    public class RejectRefundRequest
    {
        [Required]
        [MaxLength(500)]
        public string RejectionReason { get; set; } = string.Empty;
    }

    public class RefundRequestQueryParameters
    {
        public string? Status { get; set; }
        public long? InvoiceId { get; set; }
    }

    public class RefundRequestResponse
    {
        public long Id { get; set; }
        public long InvoiceId { get; set; }
        public string? InvoiceNumber { get; set; }
        public long? PaymentId { get; set; }
        public string RequestType { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal? WorkDoneAmount { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string RequestedByUserId { get; set; } = string.Empty;
        public string? ApprovedByUserId { get; set; }
        public DateTimeOffset? ApprovedAt { get; set; }
        public string? RejectionReason { get; set; }
        public DateTimeOffset? ProcessedAt { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public decimal? InvoicePaidAmount { get; set; }
        public string? InvoicePaymentStatus { get; set; }
        // Filled on the list for the manager's page
        public string? PatientName { get; set; }
        public string? PatientCode { get; set; }
        public string? ServiceNames { get; set; }
    }
}
