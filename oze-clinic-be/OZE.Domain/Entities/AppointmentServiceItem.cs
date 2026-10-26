namespace OZE.Domain.Entities
{
    // One service the patient asked for in an appointment
    public class AppointmentServiceItem
    {
        public long Id { get; set; }
        public long AppointmentId { get; set; }
        public int ServiceId { get; set; }
        // Copied at booking time so later catalog changes do not alter old appointments
        public int DurationMinutes { get; set; }
        public decimal PriceAtBooking { get; set; }
        public string Status { get; set; } = "REQUESTED";
        public DateTimeOffset CreatedAt { get; set; }

        public virtual Appointment Appointment { get; set; } = null!;
        public virtual Service Service { get; set; } = null!;
    }
}
