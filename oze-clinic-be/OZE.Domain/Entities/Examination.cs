namespace OZE.Domain.Entities
{
    public class Examination
    {
        public long Id { get; set; }
        public long AppointmentId { get; set; }
        public int PatientId { get; set; }
        public int DoctorId { get; set; }
        public string? ChiefComplaint { get; set; }
        public string? ClinicalNotes { get; set; }
        public string ExaminationStatus { get; set; } = "InProgress";
        public DateTimeOffset? LockedAt { get; set; }
        public string? LockedByUserId { get; set; }
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }

        public virtual Appointment Appointment { get; set; } = null!;
        public virtual Patient Patient { get; set; } = null!;
        public virtual StaffProfile Doctor { get; set; } = null!;
        public virtual ICollection<DentalChartEntry> DentalChartEntries { get; set; } = new List<DentalChartEntry>();
        public virtual ICollection<ClinicalDiagnosis> Diagnoses { get; set; } = new List<ClinicalDiagnosis>();
        public virtual ICollection<ImagingRequest> ImagingRequests { get; set; } = new List<ImagingRequest>();
        public virtual ICollection<TreatmentPlan> TreatmentPlans { get; set; } = new List<TreatmentPlan>();
        public virtual ICollection<ClinicalRecordAddendum> Addenda { get; set; } = new List<ClinicalRecordAddendum>();
        public virtual ICollection<Prescription> Prescriptions { get; set; } = new List<Prescription>();
    }
}
