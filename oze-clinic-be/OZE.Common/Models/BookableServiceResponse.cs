namespace OZE.Common.Models
{
    public class BookableServiceResponse
    {
        public int ServiceId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal ReferencePrice { get; set; }
        public int? EstimatedMinutes { get; set; }
        // The general exam is added to every booking, so the screen shows it ticked and locked
        public bool IsMandatory { get; set; }
    }
}
