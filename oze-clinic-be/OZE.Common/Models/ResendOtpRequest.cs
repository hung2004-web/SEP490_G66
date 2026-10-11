using System.ComponentModel.DataAnnotations;
using OZE.Common.Constants;

namespace OZE.Common.Models
{
    public class ResendOtpRequest
    {
        [Required(ErrorMessage = ErrorConstants.AuthMessage.SessionIdRequired)]
        public string SessionId { get; set; } = string.Empty;
    }
}
