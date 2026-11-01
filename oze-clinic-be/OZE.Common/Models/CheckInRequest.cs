using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    // Optional body of check-in; without it the patient is checked in with normal priority
    public class CheckInRequest
    {
        // 0 normal, 1 high, 2 urgent; null means normal
        public int? Priority { get; set; }

        // Required when the priority is above normal
        [MaxLength(500)]
        public string? Reason { get; set; }
    }
}
