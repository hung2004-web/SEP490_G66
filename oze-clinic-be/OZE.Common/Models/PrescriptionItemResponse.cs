namespace OZE.Common.Models
{
    public class PrescriptionItemResponse
    {
        public string MedicationName { get; set; } = string.Empty;
        public string? Dosage { get; set; }
        public string? Frequency { get; set; }
        public string? Duration { get; set; }
        public int? Quantity { get; set; }
        public string? Instructions { get; set; }
    }
}
