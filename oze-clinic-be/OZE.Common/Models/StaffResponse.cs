namespace OZE.Common.Models
{
    public class StaffResponse
    {
        public string UserId { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Role { get; set; }
        public string? Specialization { get; set; }
        public string? LicenseNumber { get; set; }
        public bool IsActive { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }
    }
}
