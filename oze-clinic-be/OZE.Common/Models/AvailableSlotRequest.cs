using System;
using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class AvailableSlotRequest
    {
        // Services the patient picked; the general exam is added by the system, so this may be empty
        public List<int> ServiceId { get; set; } = new();

        // Variants the patient picked; each one belongs to a service, which the system finds from the variant
        public List<int> VariantId { get; set; } = new();

        [Required]
        public DateOnly? Date { get; set; }

        // Optional; null means "any suitable doctor"
        public int? DoctorId { get; set; }
    }
}
