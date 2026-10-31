namespace OZE.Common.Models
{
    public class StartExaminationResponse
    {
        public long ExaminationId { get; set; }
        public long AppointmentId { get; set; }
        public int PatientId { get; set; }
        public int DoctorId { get; set; }
        public string ExaminationStatus { get; set; } = string.Empty;
        public string AppointmentStatus { get; set; } = string.Empty;
    }
}
