using System;
using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    // A guest also sends who they are; a signed-in patient does not, because that comes from the patient record
    public class GuestBookingRequest : BookingRequest
    {
        [Required]
        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        // The format is checked in the service
        [Required]
        public string PhoneNumber { get; set; } = string.Empty;

        // Optional; the format is checked in the service only when a value is given
        public string? Email { get; set; }
    }
}
