namespace OZE.Domain.Entities
{
    public class Notification
    {
        public long Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string NotificationType { get; set; } = string.Empty;
        public string Channel { get; set; } = "InApp";
        public string? ReferenceType { get; set; }
        public string? ReferenceId { get; set; }
        public bool IsRead { get; set; }
        public DateTimeOffset? ReadAt { get; set; }
        public DateTimeOffset? SentAt { get; set; }
        public string DeliveryStatus { get; set; } = "Pending";
        public DateTimeOffset CreatedAt { get; set; }
    }
}
