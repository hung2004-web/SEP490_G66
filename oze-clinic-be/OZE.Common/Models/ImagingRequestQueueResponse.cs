namespace OZE.Common.Models
{
    public class ImagingRequestQueueResponse
    {
        public long Id { get; set; }
        public int PatientId { get; set; }
        public string PatientName { get; set; } = string.Empty;
        public string DoctorName { get; set; } = string.Empty;
        public string ImagingType { get; set; } = string.Empty;
        public string TargetArea { get; set; } = string.Empty;
        public string ClinicalIndication { get; set; } = string.Empty;
        public string RequestStatus { get; set; } = string.Empty;
        public DateTimeOffset CreatedAt { get; set; }
    }
}
