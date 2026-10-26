namespace OZE.Domain.Entities
{
    // Groups services the way the clinic presents them, e.g. Orthodontics, Implant
    public class ServiceCategory
    {
        public int Id { get; set; }
        public string CategoryCode { get; set; } = string.Empty;
        public string CategoryName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int DisplayOrder { get; set; }
        // true: a booking may pick several services of this category; false: at most one
        public bool AllowMultipleSelection { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }

        public virtual ICollection<Service> Services { get; set; } = new List<Service>();
    }
}
