using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class ChangePasswordRequest
    {
        [Required(ErrorMessage = "Current password is required")]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "New password is required")]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters")]
        public string NewPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Confirmation password is required")]
        [Compare(nameof(NewPassword), ErrorMessage = "New password and confirmation password do not match")]
        public string ConfirmPassword { get; set; } = string.Empty;

        /// <summary>
        /// Refresh token of the device that is changing the password (BR-104).
        /// When set, other sessions are revoked and this one is kept.
        /// </summary>
        public string? RefreshToken { get; set; }
    }
}
