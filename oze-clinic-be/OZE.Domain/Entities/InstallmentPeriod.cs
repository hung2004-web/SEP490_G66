namespace OZE.Domain.Entities
{
    public class InstallmentPeriod
    {
        public long Id { get; set; }
        public long InstallmentPlanId { get; set; }
        public int Sequence { get; set; }
        public decimal Amount { get; set; }
        public DateOnly DueDate { get; set; }
        public string Status { get; set; } = "Pending";
        public DateTimeOffset? PaidAt { get; set; }
        public long? PaymentId { get; set; }

        public virtual InstallmentPlan InstallmentPlan { get; set; } = null!;
        public virtual Payment? Payment { get; set; }
    }
}
