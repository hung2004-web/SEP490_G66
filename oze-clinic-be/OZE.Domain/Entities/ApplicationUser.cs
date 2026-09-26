using Microsoft.AspNetCore.Identity;

namespace OZE.Domain.Entities
{
    public class ApplicationUser : IdentityUser
    {
        public string? FullName { get; set; }
        public DateTime CreateDate { get; set; } = DateTime.UtcNow;
    }
}
