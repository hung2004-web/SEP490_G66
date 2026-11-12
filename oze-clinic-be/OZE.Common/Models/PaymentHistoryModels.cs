using OZE.Common.Models.Base;

namespace OZE.Common.Models
{
    public class PaymentHistoryQuery : PagedRequestBase
    {
        // Clinic days of the payment (paid time, or recorded time while still pending), both inclusive
        public DateOnly? FromDate { get; set; }
        public DateOnly? ToDate { get; set; }
        // CASH, BANK_TRANSFER, QR_TRANSFER
        public string? PaymentMethod { get; set; }
        // PENDING, CONFIRMED, FAILED, REFUNDED
        public string? PaymentStatus { get; set; }
    }

    public class PaymentHistoryItem
    {
        public long Id { get; set; }
        public long InvoiceId { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public string PatientCode { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string PaymentStatus { get; set; } = string.Empty;
        public string Purpose { get; set; } = string.Empty;
        public string? TransactionReference { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? PaidAt { get; set; }
        public string? ConfirmedByUserId { get; set; }
        // Who took the cash, or who confirmed the transfer
        public string? ConfirmedByName { get; set; }
    }

    public class PaymentHistoryResponse
    {
        public IReadOnlyList<PaymentHistoryItem> Items { get; set; } = Array.Empty<PaymentHistoryItem>();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
        // Confirmed money of every page that matches the filters
        public decimal ConfirmedCash { get; set; }
        public decimal ConfirmedTransfer { get; set; }
        public decimal PendingAmount { get; set; }
    }
}
