using System;
using System.Collections.Generic;

namespace OZE.Common.Models
{
    public class PatientMedicalRecordResponse
    {
        public int PatientId { get; set; }
        public string PatientCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public DateOnly? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? PhoneNumber { get; set; }
        public string? BloodType { get; set; }
        public string? Notes { get; set; }
        public List<MedicalProfileResponse> MedicalProfiles { get; set; } = new();
        public List<ExaminationSummaryResponse> Examinations { get; set; } = new();
    }
}
