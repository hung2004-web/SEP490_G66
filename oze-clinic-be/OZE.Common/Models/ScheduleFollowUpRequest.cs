using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    /// <summary>
    /// Request payload for scheduling a follow-up appointment from a previous examination encounter.
    /// </summary>
    public class ScheduleFollowUpRequest
    {
        /// <summary>
        /// Appointment date for the scheduled follow-up re-examination visit.
        /// </summary>
        [Required]
        public DateOnly? Date { get; set; }

        /// <summary>
        /// Starting time for the selected time slot.
        /// </summary>
        [Required]
        public TimeOnly? SlotStart { get; set; }

        /// <summary>
        /// Optional identifier of the doctor assigned to the follow-up appointment.
        /// </summary>
        public int? DoctorId { get; set; }

        /// <summary>
        /// List of primary service identifiers associated with the follow-up visit.
        /// </summary>
        public List<int> ServiceId { get; set; } = new();

        /// <summary>
        /// List of service variant identifiers associated with the follow-up visit.
        /// </summary>
        public List<int> VariantId { get; set; } = new();

        /// <summary>
        /// Additional notes or special instructions for the receptionist and medical staff.
        /// </summary>
        [MaxLength(500)]
        public string? Notes { get; set; }
    }
}
