using System.ComponentModel.DataAnnotations;

namespace OZE.Common.Models
{
    public class UpdateInvoiceRequest
    {
        [Range(0, double.MaxValue)]
        public decimal? DiscountAmount { get; set; }

        [MaxLength(1000)]
        public string? Notes { get; set; }

        /// <summary>
        /// When provided (non-null), replaces all line items. Omit to keep existing items.
        /// </summary>
        public List<CreateInvoiceItemRequest>? Items { get; set; }
    }
}
