using System.ComponentModel.DataAnnotations;
using OZE.Common.Constants;

namespace OZE.Common.Models
{
    public class UpdateStaffRequest
    {
        [Required(ErrorMessage = ErrorConstants.AuthMessage.FullNameRequired)]
        [MaxLength(100, ErrorMessage = ErrorConstants.AuthMessage.FullNameInvalid)]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = ErrorConstants.AuthMessage.EmailRequired)]
        [MaxLength(256, ErrorMessage = ErrorConstants.AuthMessage.EmailInvalid)]
        [EmailAddress(ErrorMessage = ErrorConstants.AuthMessage.EmailInvalid)]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = ErrorConstants.AuthMessage.PhoneRequired)]
        public string PhoneNumber { get; set; } = string.Empty;

        [Required(ErrorMessage = ErrorConstants.StaffMessage.RoleRequired)]
        [RegularExpression("^(" + RoleConstants.DoctorRole + "|" + RoleConstants.ReceptionistRole + "|"
            + RoleConstants.DentalImagingTechnicianRole + "|" + RoleConstants.ClinicManagerRole + ")$",
            ErrorMessage = ErrorConstants.StaffMessage.RoleInvalid)]
        public string Role { get; set; } = string.Empty;

        // Only kept for doctors; ignored for other roles.
        [MaxLength(100, ErrorMessage = ErrorConstants.StaffMessage.SpecializationInvalid)]
        public string? Specialization { get; set; }

        // Required for doctors (BR-088); ignored for other roles.
        [MaxLength(50, ErrorMessage = ErrorConstants.StaffMessage.LicenseNumberInvalid)]
        public string? LicenseNumber { get; set; }
    }
}
