using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class UpdateServiceRequest
    {
        [Required(ErrorMessage = "ServiceCode is required")]
        [MaxLength(20, ErrorMessage = "ServiceCode cannot exceed 20 characters")]
        public string ServiceCode { get; set; } = string.Empty;

        [Required(ErrorMessage = "ServiceName is required")]
        [MaxLength(200, ErrorMessage = "ServiceName cannot exceed 200 characters")]
        public string ServiceName { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "ReferencePrice must be greater than or equal to 0")]
        public decimal ReferencePrice { get; set; } = 0;

        [Range(1, int.MaxValue, ErrorMessage = "EstimatedMinutes must be greater than 0")]
        public int? EstimatedMinutes { get; set; }

        // Months until the patient should come back (periodic recall); empty = no recall
        [System.ComponentModel.DataAnnotations.Range(1, 60)]
        public int? RecallIntervalMonths { get; set; }

        [MaxLength(20, ErrorMessage = "RequiredRoomType cannot exceed 20 characters")]
        public string? RequiredRoomType { get; set; }

        // Left out (null) keeps the current state, so a form that does not send it does not turn the service off
        public bool? IsActive { get; set; }
    }
}
