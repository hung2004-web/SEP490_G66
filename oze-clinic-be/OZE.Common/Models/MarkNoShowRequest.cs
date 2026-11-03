using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class MarkNoShowRequest
    {
        // Optional, kept in the audit log
        [MaxLength(500)]
        public string? Reason { get; set; }
    }
}
