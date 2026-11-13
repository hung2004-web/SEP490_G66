namespace OZE.Domain.Entities
{
    // Cash taken out of the drawer during a session
    public class CashExpense
    {
        public long Id { get; set; }
        public long CashSessionId { get; set; }
        public decimal Amount { get; set; }
        public string Category { get; set; } = "Other";
        public string Description { get; set; } = string.Empty;
        public string CreatedByUserId { get; set; } = string.Empty;
        public DateTimeOffset CreatedAt { get; set; }

        public virtual CashSession CashSession { get; set; } = null!;
    }
}
