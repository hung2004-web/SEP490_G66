namespace OZE.Common.Models
{
    // Everything the doctor edits during one examination
    public class ExaminationWorkResponse
    {
        public long ExaminationId { get; set; }
        public long AppointmentId { get; set; }
        public int PatientId { get; set; }
        public string ExaminationStatus { get; set; } = string.Empty;
        public string? ChiefComplaint { get; set; }
        public string? ClinicalNotes { get; set; }
        public List<ExaminationServiceResponse> Services { get; set; } = new();
        public List<DiagnosisResponse> Diagnoses { get; set; } = new();
        // The dental chart at the end of this examination
        public List<DentalChartToothResponse> DentalChart { get; set; } = new();
    }
}
