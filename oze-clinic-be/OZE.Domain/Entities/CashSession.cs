namespace OZE.Domain.Entities
{
    // One receptionist's cash drawer from opening to hand-over
    public class CashSession
    {
        public long Id { get; set; }
        public string OpenedByUserId { get; set; } = string.Empty;
        public DateTimeOffset OpenedAt { get; set; }
        public decimal OpeningCash { get; set; }
        public string Status { get; set; } = "Open";

        // Filled in when the session is closed, so the numbers stay as they were at hand-over
        public DateTimeOffset? ClosedAt { get; set; }
        public decimal? CashCollected { get; set; }
        public decimal? TransferConfirmed { get; set; }
        public decimal? ExpenseTotal { get; set; }
        public decimal? ExpectedCash { get; set; }
        public decimal? CountedCash { get; set; }
        public decimal? Difference { get; set; }
        public string? HandoverToUserId { get; set; }
        public string? Notes { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }

        public virtual ICollection<CashExpense> Expenses { get; set; } = new List<CashExpense>();
    }
}
