using System;
using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class RescheduleAppointmentRequest
    {
        [Required]
        public DateOnly? Date { get; set; }

        [Required]
        public TimeOnly? SlotStart { get; set; }

        // Optional; null means "keep the doctor if free, otherwise any suitable doctor"
        public int? DoctorId { get; set; }
    }
}
