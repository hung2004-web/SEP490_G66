namespace OZE.Common.Models
{
    public class RoleQueryRequest
    {
        // Matches the role name or description.
        public string? Keyword { get; set; }
        public bool? IsActive { get; set; }
    }
}
