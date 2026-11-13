using System.ComponentModel.DataAnnotations;
using OZE.Common.Models.Base;

namespace OZE.Common.Models
{
    public class OpenCashSessionRequest
    {
        [Required]
        [Range(typeof(decimal), "0", "1000000000")]
        public decimal? OpeningCash { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }
    }

    public class AddCashExpenseRequest
    {
        [Required]
        [Range(typeof(decimal), "0.01", "1000000000")]
        public decimal? Amount { get; set; }

        // Supplies or Other (default)
        public string? Category { get; set; }

        [Required]
        [MaxLength(300)]
        public string Description { get; set; } = string.Empty;
    }

    public class CloseCashSessionRequest
    {
        [Required]
        [Range(typeof(decimal), "0", "1000000000")]
        public decimal? CountedCash { get; set; }

        // The receptionist of the next shift; empty when the session ends the day
        public string? HandoverToUserId { get; set; }

        // Required when the counted cash differs from the expected cash
        [MaxLength(500)]
        public string? Notes { get; set; }
    }

    public class CashSessionQuery : PagedRequestBase
    {
        public DateOnly? FromDate { get; set; }
        public DateOnly? ToDate { get; set; }
        // Manager only; a receptionist always sees their own sessions
        public string? OpenedByUserId { get; set; }
    }

    public class CashExpenseResponse
    {
        public long Id { get; set; }
        public decimal Amount { get; set; }
        public string Category { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTimeOffset CreatedAt { get; set; }
    }

    public class CashSessionPaymentItem
    {
        public long PaymentId { get; set; }
        public long InvoiceId { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public string PaymentMethod { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTimeOffset? PaidAt { get; set; }
    }

    public class CashSessionResponse
    {
        public long Id { get; set; }
        public string OpenedByUserId { get; set; } = string.Empty;
        public string OpenedByName { get; set; } = string.Empty;
        public DateTimeOffset OpenedAt { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal OpeningCash { get; set; }
        // Cash payments this receptionist took during the session
        public decimal CashCollected { get; set; }
        // Bank and QR payments this receptionist confirmed during the session (not in the drawer)
        public decimal TransferConfirmed { get; set; }
        public decimal ExpenseTotal { get; set; }
        // OpeningCash + CashCollected - ExpenseTotal
        public decimal ExpectedCash { get; set; }
        public decimal? CountedCash { get; set; }
        public decimal? Difference { get; set; }
        public DateTimeOffset? ClosedAt { get; set; }
        public string? HandoverToUserId { get; set; }
        public string? HandoverToName { get; set; }
        public string? Notes { get; set; }
        public List<CashExpenseResponse> Expenses { get; set; } = new();
        public List<CashSessionPaymentItem> Payments { get; set; } = new();
    }

    public class CashSessionSummaryResponse
    {
        public long Id { get; set; }
        public string OpenedByName { get; set; } = string.Empty;
        public DateTimeOffset OpenedAt { get; set; }
        public DateTimeOffset? ClosedAt { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal OpeningCash { get; set; }
        public decimal? CashCollected { get; set; }
        public decimal? ExpenseTotal { get; set; }
        public decimal? ExpectedCash { get; set; }
        public decimal? CountedCash { get; set; }
        public decimal? Difference { get; set; }
        public string? HandoverToName { get; set; }
    }

    public class StaffOption
    {
        public string UserId { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
    }
}
