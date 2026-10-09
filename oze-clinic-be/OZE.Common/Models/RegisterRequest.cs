using System.ComponentModel.DataAnnotations;
using OZE.Common.Constants;

namespace OZE.Common.Models
{
    public class RegisterRequest
    {
        [Required(ErrorMessage = ErrorConstants.AuthMessage.FullNameRequired)]
        [MaxLength(100, ErrorMessage = ErrorConstants.AuthMessage.FullNameInvalid)]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = ErrorConstants.AuthMessage.DateOfBirthRequired)]
        public DateOnly? DateOfBirth { get; set; }

        [Required(ErrorMessage = ErrorConstants.AuthMessage.GenderRequired)]
        [RegularExpression("^(Male|Female)$", ErrorMessage = ErrorConstants.AuthMessage.GenderInvalid)]
        public string Gender { get; set; } = string.Empty;

        [Required(ErrorMessage = ErrorConstants.AuthMessage.PhoneRequired)]
        public string PhoneNumber { get; set; } = string.Empty;

        // Optional (FR 1.1); the format is checked in the service only when a value is given.
        public string? Email { get; set; }

        [Required(ErrorMessage = ErrorConstants.AuthMessage.PasswordRequired)]
        [StringLength(32, MinimumLength = 8, ErrorMessage = ErrorConstants.AuthMessage.PasswordInvalid)]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = ErrorConstants.AuthMessage.ConfirmPasswordRequired)]
        [Compare(nameof(Password), ErrorMessage = ErrorConstants.AuthMessage.ConfirmPasswordInvalid)]
        public string ConfirmPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = ErrorConstants.AuthMessage.VerificationMethodRequired)]
        [RegularExpression("^(" + VerificationMethodConstants.Sms + "|" + VerificationMethodConstants.Email + ")$",
            ErrorMessage = ErrorConstants.AuthMessage.VerificationMethodInvalid)]
        public string VerificationMethod { get; set; } = string.Empty;
    }
}
