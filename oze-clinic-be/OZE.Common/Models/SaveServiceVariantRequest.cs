using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    // Body for creating or updating a service variant
    public class SaveServiceVariantRequest
    {
        [Required(ErrorMessage = "VariantCode is required")]
        [MaxLength(20, ErrorMessage = "VariantCode cannot exceed 20 characters")]
        public string VariantCode { get; set; } = string.Empty;

        [Required(ErrorMessage = "VariantName is required")]
        [MaxLength(100, ErrorMessage = "VariantName cannot exceed 100 characters")]
        public string VariantName { get; set; } = string.Empty;

        [MaxLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
        public string? Description { get; set; }

        // A variant is priced on its own and never falls back to the service's price
        [Range(0, double.MaxValue, ErrorMessage = "ReferencePrice must be greater than or equal to 0")]
        public decimal ReferencePrice { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "EstimatedMinutes must be greater than 0")]
        public int? EstimatedMinutes { get; set; }

        [Range(0, int.MaxValue, ErrorMessage = "DisplayOrder must be greater than or equal to 0")]
        public int DisplayOrder { get; set; }

        // Null on update keeps the current status
        public bool? IsActive { get; set; }
    }
}
