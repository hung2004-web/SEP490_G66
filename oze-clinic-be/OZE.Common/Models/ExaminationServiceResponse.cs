namespace OZE.Common.Models
{
    // One service of the appointment, shown in the examination
    public class ExaminationServiceResponse
    {
        public long Id { get; set; }
        public int ServiceId { get; set; }
        public int? VariantId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public string? VariantName { get; set; }
        public decimal Price { get; set; }
        public int DurationMinutes { get; set; }
        // True for a service the doctor added after the examination started
        public bool AddedDuringExamination { get; set; }
    }
}
