using System.ComponentModel.DataAnnotations;
using OZE.Common.Constants;

namespace OZE.Common.Models
{
    public class UpdateProfileRequest
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

        // Optional; the format is checked in the service only when a value is given. An empty value removes the email.
        public string? Email { get; set; }

        [MaxLength(500, ErrorMessage = ErrorConstants.ProfileMessage.AddressInvalid)]
        public string? Address { get; set; }
    }
}
