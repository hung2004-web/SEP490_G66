namespace OZE.Common.Models
{
    public class PendingRegistration
    {
        public string SessionId { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string OtpHash { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public DateTime LastSentAt { get; set; }
        public int FailedAttempts { get; set; }
        public bool StartFreeTrial { get; set; }
    }
}
