namespace OZE.Domain.Entities
{
    public class InstallmentPlan
    {
        public long Id { get; set; }
        public long InvoiceId { get; set; }
        public string? Notes { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public string? CreatedByUserId { get; set; }

        public virtual Invoice Invoice { get; set; } = null!;
        public virtual ICollection<InstallmentPeriod> Periods { get; set; } = new List<InstallmentPeriod>();
    }
}
