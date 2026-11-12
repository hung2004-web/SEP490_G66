using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    // F-APT-09: the receptionist books for a patient on the phone or at the counter; the booking is confirmed at once
    public class ReceptionBookingRequest : BookingRequest
    {
        // An existing patient record (with or without an account)
        public int? PatientId { get; set; }

        // For a new patient, when PatientId is empty
        [MaxLength(100)]
        public string? FullName { get; set; }

        public string? PhoneNumber { get; set; }

        [MaxLength(256)]
        public string? Email { get; set; }
    }
}
