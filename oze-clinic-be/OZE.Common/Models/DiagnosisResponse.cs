namespace OZE.Common.Models
{
    public class DiagnosisResponse
    {
        public long Id { get; set; }
        public string? DiagnosisCode { get; set; }
        public string DiagnosisName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsPrimary { get; set; }
    }
}
