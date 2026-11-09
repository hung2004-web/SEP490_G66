using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class CancelTreatmentPlanRequest
    {
        [Required]
        [MaxLength(500)]
        public string Reason { get; set; } = string.Empty;
    }
}
