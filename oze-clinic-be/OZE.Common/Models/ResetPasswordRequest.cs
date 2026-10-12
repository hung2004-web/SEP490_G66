using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class ResetPasswordRequest
    {
        [Required(ErrorMessage = "Session id is required")]
        public string SessionId { get; set; } = string.Empty;

        [Required(ErrorMessage = "New password is required")]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters")]
        public string NewPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Confirmation password is required")]
        [Compare(nameof(NewPassword), ErrorMessage = "New password and confirmation password do not match")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}
