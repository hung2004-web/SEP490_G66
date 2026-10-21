namespace OZE.Common.Models
{
    public class MedicalProfileResponse
    {
        public long Id { get; set; }
        // History, Condition, Allergy or Medication
        public string RecordType { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Severity { get; set; }
    }
}
