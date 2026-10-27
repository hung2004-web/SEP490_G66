using System;
using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class GuestBookingRequest
    {
        // Services the patient picked; the general exam is added by the system, so this may be empty
        public List<int> ServiceId { get; set; } = new();

        [Required]
        public DateOnly? Date { get; set; }

        [Required]
        public TimeOnly? SlotStart { get; set; }

        // Optional; null means the system picks the doctor with the fewest appointments
        public int? DoctorId { get; set; }

        [Required]
        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        // The format is checked in the service
        [Required]
        public string PhoneNumber { get; set; } = string.Empty;

        // Optional; the format is checked in the service only when a value is given
        public string? Email { get; set; }

        [MaxLength(500)]
        public string? Note { get; set; }
    }
}
