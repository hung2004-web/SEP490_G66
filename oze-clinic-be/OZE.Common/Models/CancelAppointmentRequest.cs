using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class CancelAppointmentRequest
    {
        [Required(ErrorMessage = "Cancellation reason is required")]
        [MaxLength(500, ErrorMessage = "Cancellation reason cannot exceed 500 characters")]
        public string Reason { get; set; } = string.Empty;
    }
}
