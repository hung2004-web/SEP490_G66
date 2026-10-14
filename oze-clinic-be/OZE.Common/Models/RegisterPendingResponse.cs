namespace OZE.Common.Models
{
    public class RegisterPendingResponse
    {
        public string SessionId { get; set; } = string.Empty;
        public string VerificationMethod { get; set; } = string.Empty;
        // Phone number or email the OTP was sent to, partly hidden.
        public string MaskedDestination { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public DateTime ResendAvailableAt { get; set; }
    }
}
