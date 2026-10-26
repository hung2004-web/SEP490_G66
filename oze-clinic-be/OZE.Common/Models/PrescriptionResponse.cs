using System.Collections.Generic;

namespace OZE.Common.Models
{
    public class PrescriptionResponse
    {
        public long Id { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public List<PrescriptionItemResponse> Items { get; set; } = new();
    }
}
