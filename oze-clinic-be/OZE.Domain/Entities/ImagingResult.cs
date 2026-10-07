namespace OZE.Domain.Entities
{
    public class ImagingResult
    {
        public long Id { get; set; }
        public long ImagingRequestId { get; set; }
        public int UploadedByTechnicianId { get; set; }
        public string FilePath { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public long? FileSize { get; set; }
        public string? MimeType { get; set; }
        public string? TechnicianNotes { get; set; }
        public int? ReviewedByDoctorId { get; set; }
        public string ReviewStatus { get; set; } = "Pending";
        public string? DoctorNotes { get; set; }
        public DateTimeOffset? ReviewedAt { get; set; }
        public DateTimeOffset CreatedAt { get; set; }

        public virtual ImagingRequest ImagingRequest { get; set; } = null!;
        public virtual StaffProfile UploadedByTechnician { get; set; } = null!;
        public virtual StaffProfile? ReviewedByDoctor { get; set; }
    }
}
