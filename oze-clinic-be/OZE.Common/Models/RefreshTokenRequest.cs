using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class RefreshTokenRequest
    {
        [Required(ErrorMessage = "Refresh Token is required")]
        public string RefreshToken { get; set; } = string.Empty;
    }
}
