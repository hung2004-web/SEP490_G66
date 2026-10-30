namespace OZE.Common.Models
{
    public class BookableVariantResponse
    {
        public int VariantId { get; set; }
        public string VariantName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal ReferencePrice { get; set; }
        public int? EstimatedMinutes { get; set; }
    }
}
