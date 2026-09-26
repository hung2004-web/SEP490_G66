namespace OZE.Common.Models
{
    public class AuthResult
    {
        public string Token { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public DateTime? ExpiresAt { get; set; }
        public string? ErrorMessage { get; set; }
        public bool Success => string.IsNullOrEmpty(ErrorMessage);
    }
}
