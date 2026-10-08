using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class ResendOtpRequest
    {
        [Required(ErrorMessage = "SessionId is required")]
        public string SessionId { get; set; } = string.Empty;
    }
}
