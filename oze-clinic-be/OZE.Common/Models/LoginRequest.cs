using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class LoginRequest
    {
        [Required(ErrorMessage = "Please enter phone number or email")]
        public string Identifier { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required")]
        public string Password { get; set; } = string.Empty;
    }
}
