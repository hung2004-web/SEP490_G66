using System;
using System.Collections.Generic;

namespace OZE.Common.Models
{
    public class ExaminationDetailResponse
    {
        public long Id { get; set; }
        public int PatientId { get; set; }
        public DateOnly AppointmentDate { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public string? ChiefComplaint { get; set; }
        public string? ClinicalNotes { get; set; }
        public string ExaminationStatus { get; set; } = string.Empty;
        public List<DiagnosisResponse> Diagnoses { get; set; } = new();
        public List<PrescriptionResponse> Prescriptions { get; set; } = new();
        public List<TreatmentPlanSummaryResponse> TreatmentPlans { get; set; } = new();
        public List<ImagingResponse> Images { get; set; } = new();
    }
}
