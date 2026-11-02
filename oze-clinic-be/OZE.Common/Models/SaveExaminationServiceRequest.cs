using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    // Used to add a service and to change one: the service, and the variant when one is chosen
    public class SaveExaminationServiceRequest
    {
        [Required]
        public int? ServiceId { get; set; }

        // Set when a variant of the service is chosen
        public int? VariantId { get; set; }
    }
}
