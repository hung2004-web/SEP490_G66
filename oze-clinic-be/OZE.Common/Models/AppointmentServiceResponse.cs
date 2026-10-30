namespace OZE.Common.Models
{
    public class AppointmentServiceResponse
    {
        public int ServiceId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public int? VariantId { get; set; }
        public string? VariantName { get; set; }
        public int DurationMinutes { get; set; }
        public decimal PriceAtBooking { get; set; }
    }
}
