namespace OZE.Common.Models
{
    public class PatientDetailDto : PatientDto
    {
        public List<PatientMedicalProfileDto> MedicalProfiles { get; set; } = new();
        public int TotalAppointments { get; set; }
    }
}
