using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class CreateInvoiceRequest
    {
        [Required]
        public int PatientId { get; set; }

        public long? AppointmentId { get; set; }

        public long? TreatmentPlanId { get; set; }

        [Range(0, double.MaxValue)]
        public decimal DiscountAmount { get; set; }

        [MaxLength(1000)]
        public string? Notes { get; set; }

        [Required]
        [MinLength(1)]
        public List<CreateInvoiceItemRequest> Items { get; set; } = new();
    }

    public class CreateInvoiceItemRequest
    {
        public int? ServiceId { get; set; }

        [MaxLength(200)]
        public string? ServiceName { get; set; }

        [MaxLength(500)]
        public string? Description { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? UnitPrice { get; set; }

        [Range(1, int.MaxValue)]
        public int Quantity { get; set; } = 1;

        public long? TreatmentPlanStageId { get; set; }

        public int? SortOrder { get; set; }
    }
}
