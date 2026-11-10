using System;
using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class SaveFollowUpRequest
    {
        public DateOnly? FollowUpDate { get; set; }

        [MaxLength(500)]
        public string? FollowUpNotes { get; set; }
    }
}
