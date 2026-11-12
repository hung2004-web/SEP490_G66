using System.ComponentModel.DataAnnotations;
using OZE.Common.Models.Base;

namespace OZE.Common.Models
{
    public class CreateConsultationRequest
    {
        [Required]
        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        public string PhoneNumber { get; set; } = string.Empty;

        [MaxLength(256)]
        public string? Email { get; set; }

        [MaxLength(1000)]
        public string? Note { get; set; }
    }

    public class HandleConsultationRequest
    {
        // Contacted, Booked, Closed
        [Required]
        public string Status { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Note { get; set; }
    }

    public class ConsultationQuery : PagedRequestBase
    {
        public string? Status { get; set; }
    }

    public class ConsultationResponse
    {
        public long Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Note { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? HandledByName { get; set; }
        public DateTimeOffset? HandledAt { get; set; }
        public string? HandleNote { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }
}
