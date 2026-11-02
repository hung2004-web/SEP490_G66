using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    // Used to add a medication to the prescription and to change one
    public class SavePrescriptionItemRequest
    {
        [Required]
        public string? MedicationName { get; set; }

        // For example "500mg"
        public string? Dosage { get; set; }

        // For example "3 times a day"
        public string? Frequency { get; set; }

        // For example "5 days"
        public string? Duration { get; set; }

        public int? Quantity { get; set; }

        public string? Instructions { get; set; }
    }
}
