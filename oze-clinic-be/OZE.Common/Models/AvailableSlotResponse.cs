using System;

namespace OZE.Common.Models
{
    public class AvailableSlotResponse
    {
        public int DoctorId { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public DateOnly Date { get; set; }
        public TimeOnly SlotStart { get; set; }
        public TimeOnly SlotEnd { get; set; }
    }
}
