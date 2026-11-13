namespace OZE.Common.Models
{
    public class HomeDoctorResponse
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? Specialization { get; set; }
        public string? LicenseNumber { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Gender { get; set; }
        public DateOnly? DateOfBirth { get; set; }
        public DateOnly? HireDate { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
