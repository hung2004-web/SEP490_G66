using Microsoft.AspNetCore.Identity;

namespace OZE.Domain.Entities
{
    public class ApplicationUser : IdentityUser
    {
        public DateTimeOffset CreatedAt { get; set; }

        public virtual Patient? Patient { get; set; }
        public virtual StaffProfile? StaffProfile { get; set; }
    }
}
