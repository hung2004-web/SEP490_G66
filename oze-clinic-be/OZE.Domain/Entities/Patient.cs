namespace OZE.Domain.Entities
{
    public class Patient
    {
        public int Id { get; set; }
        public string? UserId { get; set; }
        public string PatientCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? Email { get; set; }
        public DateOnly? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? Address { get; set; }
        public string? InsuranceNumber { get; set; }
        public string? EmergencyContactName { get; set; }
        public string? EmergencyContactPhone { get; set; }
        public string? BloodType { get; set; }
        public string? Notes { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }
        public DateTimeOffset? DeletedAt { get; set; }

        public virtual ApplicationUser? User { get; set; }
        public virtual ICollection<PatientMedicalProfile> MedicalProfiles { get; set; } = new List<PatientMedicalProfile>();
        public virtual ICollection<PatientDocument> Documents { get; set; } = new List<PatientDocument>();
        public virtual ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    }
}
