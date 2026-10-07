namespace OZE.Domain.Entities
{
    public class PrescriptionItem
    {
        public long Id { get; set; }
        public long PrescriptionId { get; set; }
        public string MedicationName { get; set; } = string.Empty;
        public string? Dosage { get; set; }
        public string? Frequency { get; set; }
        public string? Duration { get; set; }
        public int? Quantity { get; set; }
        public string? Instructions { get; set; }
        public int SortOrder { get; set; }

        public virtual Prescription Prescription { get; set; } = null!;
    }
}
