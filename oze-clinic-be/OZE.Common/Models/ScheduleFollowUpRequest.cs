using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class ScheduleFollowUpRequest
    {
        [Required]
        public DateOnly? Date { get; set; }

        [Required]
        public TimeOnly? SlotStart { get; set; }

        public int? DoctorId { get; set; }

        public List<int> ServiceId { get; set; } = new();

        public List<int> VariantId { get; set; } = new();

        [MaxLength(500)]
        public string? Notes { get; set; }
    }
}
