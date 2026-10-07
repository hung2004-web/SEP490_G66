namespace OZE.Domain.Entities
{
    public class ImagingRequest
    {
        public long Id { get; set; }
        public long ExaminationId { get; set; }
        public int RequestedByDoctorId { get; set; }
        public string ImagingType { get; set; } = string.Empty;
        public string? TargetArea { get; set; }
        public string RequestStatus { get; set; } = "Pending";
        public string? ClinicalIndication { get; set; }
        public string? Notes { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }

        public virtual Examination Examination { get; set; } = null!;
        public virtual StaffProfile RequestedByDoctor { get; set; } = null!;
        public virtual ICollection<ImagingResult> Results { get; set; } = new List<ImagingResult>();
    }
}
