using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class CreateMedicalProfileRequest
    {
        [Required(ErrorMessage = "RecordType is required")]
        [MaxLength(20, ErrorMessage = "RecordType cannot exceed 20 characters")]
        public string RecordType { get; set; } = string.Empty; // "History", "Condition", "Allergy", "Medication"

        [Required(ErrorMessage = "Title is required")]
        [MaxLength(200, ErrorMessage = "Title cannot exceed 200 characters")]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        [MaxLength(20, ErrorMessage = "Severity cannot exceed 20 characters")]
        public string? Severity { get; set; } // "Mild", "Moderate", "Severe"

        [MaxLength(20, ErrorMessage = "Status cannot exceed 20 characters")]
        public string Status { get; set; } = "Active"; // "Active", "Resolved", "Discontinued"

        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
    }
}
