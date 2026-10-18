using System;

namespace OZE.Common.Models
{
    public class AppointmentResponse
    {
        public long Id { get; set; }
        public int PatientId { get; set; }
        public string PatientCode { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public string PatientPhoneNumber { get; set; } = string.Empty;
        public int? DoctorId { get; set; }
        public string? DoctorName { get; set; }
        public int ServiceId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public string AppointmentType { get; set; } = string.Empty;
        public DateOnly AppointmentDate { get; set; }
        public TimeOnly TimeSlotStart { get; set; }
        public TimeOnly TimeSlotEnd { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }
}
