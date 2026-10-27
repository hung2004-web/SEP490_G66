using System.ComponentModel.DataAnnotations;
using OZE.Common.Constants;

namespace OZE.Common.Models
{
    public class VerifyResetOtpRequest
    {
        [Required(ErrorMessage = ErrorConstants.AuthMessage.SessionIdRequired)]
        public string SessionId { get; set; } = string.Empty;

        [Required(ErrorMessage = ErrorConstants.AuthMessage.OtpRequired)]
        [RegularExpression(@"^\s*\d{6}\s*$", ErrorMessage = ErrorConstants.AuthMessage.InvalidOtp)]
        public string Otp { get; set; } = string.Empty;
    }
}
