namespace OZE.Common.Models
{
    public class RegisterPendingResponse
    {
        public string SessionId { get; set; } = string.Empty;
        public string MaskedPhoneNumber { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public DateTime ResendAvailableAt { get; set; }
    }
}
