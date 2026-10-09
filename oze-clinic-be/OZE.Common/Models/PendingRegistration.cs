namespace OZE.Common.Models
{
    // OTP session of an account created by Register and not verified yet.
    public class PendingRegistration
    {
        public string SessionId { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string SecurityStamp { get; set; } = string.Empty;
        public string VerificationMethod { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public DateOnly DateOfBirth { get; set; }
        public string Gender { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string PhoneNumber { get; set; } = string.Empty;
        public string OtpHash { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public DateTime LastSentAt { get; set; }
        public int FailedAttempts { get; set; }
    }
}
