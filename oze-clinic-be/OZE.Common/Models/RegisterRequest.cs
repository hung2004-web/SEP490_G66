using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class RegisterRequest
    {
        [Required(ErrorMessage = "Full Name is required")]
        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid Email format")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required")]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters")]
        public string Password { get; set; } = string.Empty;

        public bool StartFreeTrial { get; set; }
    }
}
