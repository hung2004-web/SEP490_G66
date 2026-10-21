using System;

namespace OZE.Common.Models
{
    public class ExaminationSummaryResponse
    {
        public long Id { get; set; }
        public DateOnly AppointmentDate { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public string? ChiefComplaint { get; set; }
        public string? PrimaryDiagnosis { get; set; }
        public string ExaminationStatus { get; set; } = string.Empty;
    }
}
