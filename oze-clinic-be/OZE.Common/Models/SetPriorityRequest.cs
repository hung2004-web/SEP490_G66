using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class SetPriorityRequest
    {
        // 0 normal, 1 high, 2 urgent
        [Required]
        public int? Priority { get; set; }

        // Required when the priority is above normal
        [MaxLength(500)]
        public string? Reason { get; set; }
    }
}
