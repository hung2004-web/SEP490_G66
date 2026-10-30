using System;
using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    // Booking by a signed-in patient: name, phone and email come from the patient record, not from the request
    public class PatientBookingRequest
    {
        // Services the patient picked; the general exam is added by the system, so this may be empty
        public List<int> ServiceId { get; set; } = new();

        // Variants the patient picked; each one belongs to a service, which the system finds from the variant
        public List<int> VariantId { get; set; } = new();

        [Required]
        public DateOnly? Date { get; set; }

        [Required]
        public TimeOnly? SlotStart { get; set; }

        // Optional; null means the system picks the doctor with the fewest appointments
        public int? DoctorId { get; set; }

        [MaxLength(500)]
        public string? Note { get; set; }
    }
}
