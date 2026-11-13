namespace OZE.Domain.Entities
{
    // One call the receptionist made about a follow-up visit, kept as a history (never edited)
    public class FollowUpContact
    {
        public long Id { get; set; }
        public long ExaminationId { get; set; }
        // Booked, CallBack, Unreachable, Declined
        public string Outcome { get; set; } = string.Empty;
        public string? Note { get; set; }
        public DateOnly? CallBackDate { get; set; }
        public string CreatedByUserId { get; set; } = string.Empty;
        public DateTimeOffset CreatedAt { get; set; }

        public virtual Examination Examination { get; set; } = null!;
    }

    // A reminder to pay sent to the patient (by the receptionist or by the daily job)
    public class PaymentReminder
    {
        public long Id { get; set; }
        public long InvoiceId { get; set; }
        public long? InstallmentPeriodId { get; set; }
        // "SMS", "Email" or "SMS,Email"; empty when the patient has neither
        public string Channels { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public bool IsAutomatic { get; set; }
        public string? SentByUserId { get; set; }
        public DateTimeOffset SentAt { get; set; }

        public virtual Invoice Invoice { get; set; } = null!;
        public virtual InstallmentPeriod? InstallmentPeriod { get; set; }
    }

    // The manager's end-of-day check of all cash drawers and transfers; once confirmed the day is closed
    public class DailyReconciliation
    {
        public long Id { get; set; }
        public DateOnly ClinicDate { get; set; }
        public int SessionCount { get; set; }
        public decimal CashCollected { get; set; }
        public decimal CashExpected { get; set; }
        public decimal CashCounted { get; set; }
        public decimal CashDifference { get; set; }
        public decimal TransferConfirmed { get; set; }
        public int PendingTransferCount { get; set; }
        public decimal PendingTransferAmount { get; set; }
        public decimal RefundTotal { get; set; }
        public string? Notes { get; set; }
        public string ConfirmedByUserId { get; set; } = string.Empty;
        public DateTimeOffset ConfirmedAt { get; set; }
    }
}
