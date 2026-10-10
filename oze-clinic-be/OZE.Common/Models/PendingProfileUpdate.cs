namespace OZE.Common.Models
{
    // Profile changes waiting for the OTP sent to the new phone number.
    public class PendingProfileUpdate
    {
        public string SessionId { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string SecurityStamp { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public DateOnly DateOfBirth { get; set; }
        public string Gender { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string OtpHash { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public DateTime LastSentAt { get; set; }
        public int FailedAttempts { get; set; }
    }
}
