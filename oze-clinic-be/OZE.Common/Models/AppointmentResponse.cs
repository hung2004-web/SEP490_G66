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
        // Kept for the current frontend: the first service of the appointment
        public int ServiceId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public List<AppointmentServiceResponse> Services { get; set; } = new();
        public string AppointmentType { get; set; } = string.Empty;
        public DateOnly AppointmentDate { get; set; }
        public TimeOnly TimeSlotStart { get; set; }
        public TimeOnly TimeSlotEnd { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTimeOffset? CheckInAt { get; set; }
        // Filled when the patient checks in: the room of the doctor's shift, where the patient goes
        public int? RoomId { get; set; }
        public string? RoomName { get; set; }
        public string? CancellationReason { get; set; }
        public string? Notes { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }
}
