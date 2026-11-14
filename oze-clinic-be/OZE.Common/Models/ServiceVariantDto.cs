namespace OZE.Common.Models
{
    // One variant of a service, as the clinic manager sees it (active and inactive)
    public class ServiceVariantDto
    {
        public int Id { get; set; }
        public int ServiceId { get; set; }
        public string VariantCode { get; set; } = string.Empty;
        public string VariantName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal ReferencePrice { get; set; }
        public int? EstimatedMinutes { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }
    }
}
