using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class CreatePatientRequest
    {
        [Required(ErrorMessage = "FullName is required")]
        [MaxLength(200, ErrorMessage = "FullName cannot exceed 200 characters")]
        public string FullName { get; set; } = string.Empty;

        [MaxLength(20, ErrorMessage = "PhoneNumber cannot exceed 20 characters")]
        public string? PhoneNumber { get; set; }

        [EmailAddress(ErrorMessage = "Invalid email format")]
        [MaxLength(256, ErrorMessage = "Email cannot exceed 256 characters")]
        public string? Email { get; set; }

        public DateOnly? DateOfBirth { get; set; }

        [MaxLength(10, ErrorMessage = "Gender cannot exceed 10 characters")]
        public string? Gender { get; set; }

        [MaxLength(500, ErrorMessage = "Address cannot exceed 500 characters")]
        public string? Address { get; set; }

        [MaxLength(50, ErrorMessage = "InsuranceNumber cannot exceed 50 characters")]
        public string? InsuranceNumber { get; set; }

        [MaxLength(200, ErrorMessage = "EmergencyContactName cannot exceed 200 characters")]
        public string? EmergencyContactName { get; set; }

        [MaxLength(20, ErrorMessage = "EmergencyContactPhone cannot exceed 20 characters")]
        public string? EmergencyContactPhone { get; set; }

        [MaxLength(5, ErrorMessage = "BloodType cannot exceed 5 characters")]
        public string? BloodType { get; set; }

        public string? Notes { get; set; }
    }
}
