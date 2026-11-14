namespace OZE.Common.Models
{
    // One in-app notification of the signed-in user
    public class NotificationResponse
    {
        public long Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string NotificationType { get; set; } = string.Empty;
        // What to open when clicked, e.g. "Appointment" + "123"
        public string? ReferenceType { get; set; }
        public string? ReferenceId { get; set; }
        public bool IsRead { get; set; }
        public DateTimeOffset? ReadAt { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }

    // A page of notifications, plus how many are still unread (for the bell badge)
    public class NotificationListResponse
    {
        public List<NotificationResponse> Items { get; set; } = new();
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalItems { get; set; }
        public int TotalPages { get; set; }
        public int UnreadCount { get; set; }
    }

    public class NotificationQueryParameters
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public bool UnreadOnly { get; set; }
    }

    public class UnreadCountResponse
    {
        public int UnreadCount { get; set; }
    }

    // What to send: the same text to every recipient
    public record NotificationContent(string Title, string Message, string? ReferenceType = null, string? ReferenceId = null);
}
