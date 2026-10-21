using System;

namespace OZE.Common.Models
{
    public class ImagingResponse
    {
        public long ResultId { get; set; }
        public string ImagingType { get; set; } = string.Empty;
        public string? TargetArea { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string FilePath { get; set; } = string.Empty;
        public string ReviewStatus { get; set; } = string.Empty;
        public string? DoctorNotes { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }
}
