namespace OZE.Common.Models
{
    public class ServiceDto
    {
        public int Id { get; set; }
        public string ServiceCode { get; set; } = string.Empty;
        public string ServiceName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal ReferencePrice { get; set; }
        public int? EstimatedMinutes { get; set; }
        public string? RequiredRoomType { get; set; }
        public bool IsActive { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }
    }
}
