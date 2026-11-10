namespace OZE.Common.Models
{
    public class PaymentWarning
    {
        public string Code { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public long? InvoiceId { get; set; }
        public string? InvoiceNumber { get; set; }
        public decimal? RemainingAmount { get; set; }
        public int? OverduePeriodCount { get; set; }
    }
}
