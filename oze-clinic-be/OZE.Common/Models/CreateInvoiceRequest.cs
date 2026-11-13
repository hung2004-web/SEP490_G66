using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class CreateInvoiceRequest
    {
        [Required]
        public int PatientId { get; set; }

        public long? AppointmentId { get; set; }

        public long? TreatmentPlanId { get; set; }

        /// <summary>
        /// Optional package total for plan invoices when Items is empty (Open-P4).
        /// If omitted, EstimatedTotalCost from the treatment plan is used.
        /// Ignored when Items is non-empty. Must be &gt; 0 when provided.
        /// </summary>
        [Range(typeof(decimal), "0.01", "79228162514264337593543950335")]
        public decimal? TotalAmount { get; set; }

        [Range(0, double.MaxValue)]
        public decimal DiscountAmount { get; set; }

        [MaxLength(1000)]
        public string? Notes { get; set; }

        /// <summary>
        /// Optional for plan invoices (TreatmentPlanId set): empty → single synthetic package line.
        /// Still required for visit invoices without a treatment plan.
        /// </summary>
        public List<CreateInvoiceItemRequest>? Items { get; set; }
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
