using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class AddExaminationServiceRequest
    {
        [Required]
        public int? ServiceId { get; set; }

        // Set when a variant of the service is chosen
        public int? VariantId { get; set; }
    }
}
