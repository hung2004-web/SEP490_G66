using System;
using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    /// <summary>
    /// Request payload for updating or setting follow-up notes and target date for an examination.
    /// </summary>
    public class SaveFollowUpRequest
    {
        /// <summary>
        /// Expected date for patient follow-up re-examination visit.
        /// </summary>
        public DateOnly? FollowUpDate { get; set; }

        /// <summary>
        /// Clinical follow-up instructions, reminders, or special doctor notes for the next visit.
        /// </summary>
        [MaxLength(500)]
        public string? FollowUpNotes { get; set; }
    }
}
