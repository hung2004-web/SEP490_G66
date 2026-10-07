namespace OZE.Domain.Entities
{
    public class SystemConfiguration
    {
        public int Id { get; set; }
        public string ConfigKey { get; set; } = string.Empty;
        public string ConfigValue { get; set; } = string.Empty;
        public string DataType { get; set; } = "String";
        public string? Description { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }
        public string? UpdatedByUserId { get; set; }
    }
}
