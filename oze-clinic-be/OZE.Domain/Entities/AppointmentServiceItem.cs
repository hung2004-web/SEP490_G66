namespace OZE.Domain.Entities
{
    // One service the patient asked for in an appointment
    public class AppointmentServiceItem
    {
        public long Id { get; set; }
        public long AppointmentId { get; set; }
        public int ServiceId { get; set; }
        // Null for a service booked as a whole; set when the patient picked a variant of the service
        public int? VariantId { get; set; }
        // Copied at booking time so later catalog changes do not alter old appointments
        public int DurationMinutes { get; set; }
        public decimal PriceAtBooking { get; set; }
        public DateTimeOffset CreatedAt { get; set; }

        public virtual Appointment Appointment { get; set; } = null!;
        public virtual Service Service { get; set; } = null!;
        public virtual ServiceVariant? Variant { get; set; }
    }
}
