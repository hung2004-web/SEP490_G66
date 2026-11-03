using System.ComponentModel.DataAnnotations;
using OZE.Common.Constants;

namespace OZE.Common.Models
{
    public class ResetPasswordRequest
    {
        [Required(ErrorMessage = "Session id is required")]
        public string SessionId { get; set; } = string.Empty;

        [Required(ErrorMessage = "New password is required")]
        // The same rule as registration
        [StringLength(32, MinimumLength = 8, ErrorMessage = ErrorConstants.AuthMessage.PasswordInvalid)]
        public string NewPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Confirmation password is required")]
        [Compare(nameof(NewPassword), ErrorMessage = "New password and confirmation password do not match")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}
