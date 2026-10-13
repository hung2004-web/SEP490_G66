namespace OZE.Common.Models
{
    public class StaffQueryRequest
    {
        // Matches the full name, email or phone number.
        public string? Keyword { get; set; }
        public string? Role { get; set; }
        public bool? IsActive { get; set; }
    }
}
