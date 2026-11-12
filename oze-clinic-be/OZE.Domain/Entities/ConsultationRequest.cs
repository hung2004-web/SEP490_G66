namespace OZE.Domain.Entities
{
    // A visitor leaves a name and phone on the public site and asks to be called back for advice
    public class ConsultationRequest
    {
        public long Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Note { get; set; }
        // New, Contacted, Booked, Closed
        public string Status { get; set; } = "New";
        public string? HandledByUserId { get; set; }
        public DateTimeOffset? HandledAt { get; set; }
        public string? HandleNote { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }
}
