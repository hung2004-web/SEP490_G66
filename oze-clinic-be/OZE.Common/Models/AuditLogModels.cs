namespace OZE.Common.Models
{
    // Filters for the audit log list (clinic manager). Dates are clinic days, both ends included.
    public class AuditLogQueryParameters
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public DateOnly? FromDate { get; set; }
        public DateOnly? ToDate { get; set; }
        // Who did it
        public string? UserId { get; set; }
        // e.g. APPOINTMENT_CANCELLED
        public string? Action { get; set; }
        // e.g. Appointment, with EntityId to see the history of one record
        public string? EntityType { get; set; }
        public string? EntityId { get; set; }
        // Name of the person, IP address or record id
        public string? Keyword { get; set; }
    }

    // One row of the audit log list
    public class AuditLogResponse
    {
        public long Id { get; set; }
        // Null for an action done by the system (e.g. a background job)
        public string? UserId { get; set; }
        public string? UserName { get; set; }
        public string? UserRole { get; set; }
        public string Action { get; set; } = string.Empty;
        public string? EntityType { get; set; }
        public string? EntityId { get; set; }
        public string? IpAddress { get; set; }
        public string? UserAgent { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }

    // One audit log with the values before and after (JSON, as stored)
    public class AuditLogDetailResponse : AuditLogResponse
    {
        public string? OldValues { get; set; }
        public string? NewValues { get; set; }
        // Reason or extra note given with the action
        public string? AdditionalData { get; set; }
    }

    public class AuditLogListResponse
    {
        public List<AuditLogResponse> Items { get; set; } = new();
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalItems { get; set; }
        public int TotalPages { get; set; }
    }

    // Who a user id is, for showing the audit log
    public record AuditActor(string UserId, string? Name, string? Role);
}
