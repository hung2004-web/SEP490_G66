using System;
using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class AvailableSlotRequest
    {
        [Required]
        public int? ServiceId { get; set; }

        [Required]
        public DateOnly? Date { get; set; }

        // Optional; null means "any suitable doctor"
        public int? DoctorId { get; set; }
    }
}
