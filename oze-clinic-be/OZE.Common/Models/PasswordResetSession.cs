using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Common.Models
{
    // Password reset session; it can reset the password only after the OTP step marks it verified.
    public class PasswordResetSession
    {
        public string SessionId { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public bool IsOtpVerified { get; set; }
        public string? ResetToken { get; set; }
        public DateTime ExpiresAt { get; set; }
        public string OtpHash { get; set; } = string.Empty;
        public int FailedAttempts { get; set; }
    }
}
