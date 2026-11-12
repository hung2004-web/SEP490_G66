using System.ComponentModel.DataAnnotations;
using OZE.Common.Models.Base;

namespace OZE.Common.Models
{
    // ----- follow-up calls -----

    public class RecordFollowUpContactRequest
    {
        // Booked, CallBack, Unreachable, Declined
        [Required]
        public string Outcome { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Note { get; set; }

        // Required when the outcome is CallBack
        public DateOnly? CallBackDate { get; set; }
    }

    public class FollowUpContactResponse
    {
        public long Id { get; set; }
        public string Outcome { get; set; } = string.Empty;
        public string? Note { get; set; }
        public DateOnly? CallBackDate { get; set; }
        public string? CreatedByName { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }

    // ----- patient debts and payment reminders -----

    public class DebtQuery : PagedRequestBase
    {
        // Only invoices with an installment past its due date
        public bool OverdueOnly { get; set; }
    }

    public class DebtItemResponse
    {
        public long InvoiceId { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public int PatientId { get; set; }
        public string PatientCode { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public string? PatientPhoneNumber { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public int AgeDays { get; set; }
        public decimal FinalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal RemainingAmount { get; set; }
        public string PaymentStatus { get; set; } = string.Empty;
        public bool HasInstallmentPlan { get; set; }
        public DateOnly? NextDueDate { get; set; }
        public decimal? NextDueAmount { get; set; }
        public int OverdueCount { get; set; }
        public decimal OverdueAmount { get; set; }
        public DateTimeOffset? LastRemindedAt { get; set; }
        public int ReminderCount { get; set; }
    }

    public class DebtListResponse
    {
        public IReadOnlyList<DebtItemResponse> Items { get; set; } = Array.Empty<DebtItemResponse>();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
        // Across every open invoice, not only this page
        public decimal TotalRemaining { get; set; }
        public int OverdueInvoiceCount { get; set; }
    }

    public class RemindPaymentRequest
    {
        // Send again even if a reminder went out in the last hours
        public bool Force { get; set; }
    }

    public class PaymentReminderResponse
    {
        public long Id { get; set; }
        public long InvoiceId { get; set; }
        public long? InstallmentPeriodId { get; set; }
        public string Channels { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public bool IsAutomatic { get; set; }
        public string? SentByName { get; set; }
        public DateTimeOffset SentAt { get; set; }
    }

    public class BatchPaymentReminderResponse
    {
        public int TotalTargeted { get; set; }
        public int RemindedCount { get; set; }
        public int FailedCount { get; set; }
    }

    public class PaymentReminderSettings
    {
        public bool Enabled { get; set; } = true;
        public int RunHour { get; set; } = 8;
        // Installments due this many days ahead are reminded (1 = tomorrow)
        public int DaysAhead { get; set; } = 1;
        public int CheckIntervalMinutes { get; set; } = 30;
    }

    // ----- end-of-day reconciliation -----

    public class ReconciliationSessionItem
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

    public class PendingTransferItem
    {
        public long PaymentId { get; set; }
        public long InvoiceId { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public string PaymentMethod { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string? TransactionReference { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }

    public class RefundOfDayItem
    {
        public long Id { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTimeOffset? ProcessedAt { get; set; }
    }

    public class DailyReconciliationResponse
    {
        public DateOnly ClinicDate { get; set; }
        public bool IsConfirmed { get; set; }
        public DateTimeOffset? ConfirmedAt { get; set; }
        public string? ConfirmedByName { get; set; }
        public string? Notes { get; set; }

        public List<ReconciliationSessionItem> Sessions { get; set; } = new();
        public int OpenSessionCount { get; set; }

        // All cash confirmed that day across the clinic
        public decimal CashCollected { get; set; }
        // Cash taken while nobody had a drawer open: it belongs to no hand-over
        public decimal CashOutsideSessions { get; set; }
        public decimal CashExpected { get; set; }
        public decimal CashCounted { get; set; }
        public decimal CashDifference { get; set; }
        public decimal TransferConfirmed { get; set; }

        public List<PendingTransferItem> PendingTransfers { get; set; } = new();
        public decimal PendingTransferAmount { get; set; }

        public List<RefundOfDayItem> Refunds { get; set; } = new();
        public decimal RefundTotal { get; set; }
    }

    public class ConfirmReconciliationRequest
    {
        // Required when there is a cash difference, cash outside drawers or a transfer still waiting
        [MaxLength(500)]
        public string? Notes { get; set; }
    }
}
