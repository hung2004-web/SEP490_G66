namespace OZE.Common.Models
{
    public class StartExaminationResponse
    {
        public long ExaminationId { get; set; }
        public long AppointmentId { get; set; }
        public int PatientId { get; set; }
        public string PatientName { get; set; } = string.Empty;
        public string ExaminationStatus { get; set; } = string.Empty;
        // Filled in from the note left when booking; the doctor corrects it during the examination
        public string? ChiefComplaint { get; set; }
        public DateTimeOffset StartedAt { get; set; }
    }
}
