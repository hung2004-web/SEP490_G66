namespace OZE.Common.Models
{
    public class ImagingRequestResponse
    {
        public long Id { get; set; }
        public long ExaminationId { get; set; }
        public int PatientId { get; set; }
        public string ImagingType { get; set; } = string.Empty;
        public string TargetArea { get; set; } = string.Empty;
        public string ClinicalIndication { get; set; } = string.Empty;
        public string RequestStatus { get; set; } = string.Empty;
        public DateTimeOffset CreatedAt { get; set; }
    }
}
