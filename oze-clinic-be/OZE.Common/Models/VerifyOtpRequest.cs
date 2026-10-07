using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class VerifyOtpRequest
    {
        [Required(ErrorMessage = "SessionId is required")]
        public string SessionId { get; set; } = string.Empty;

        [Required(ErrorMessage = "OTP is required")]
        [StringLength(6, MinimumLength = 6, ErrorMessage = "OTP must be 6 digits")]
        public string Otp { get; set; } = string.Empty;
    }
}
