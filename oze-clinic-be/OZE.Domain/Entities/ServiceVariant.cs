namespace OZE.Domain.Entities
{
    // A variant of a service, e.g. the service "Cosmetic braces" has metal, ceramic and clear-aligner variants
    public class ServiceVariant
    {
        public int Id { get; set; }
        public int ServiceId { get; set; }
        public string VariantCode { get; set; } = string.Empty;
        public string VariantName { get; set; } = string.Empty;
        public string? Description { get; set; }
        // A variant is booked and priced as its own line, so it does not fall back to the service's price
        public decimal ReferencePrice { get; set; }
        public int? EstimatedMinutes { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }

        public virtual Service Service { get; set; } = null!;
    }
}
