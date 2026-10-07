namespace OZE.Common.Models
{
    public class RegisterOtpSettings
    {
        public int ExpiresInMinutes { get; set; } = 5;
        public int ResendCooldownSeconds { get; set; } = 60;
        public int MaxAttempts { get; set; } = 5;
    }
}
