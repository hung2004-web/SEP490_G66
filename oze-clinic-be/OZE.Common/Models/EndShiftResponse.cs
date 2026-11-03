namespace OZE.Common.Models
{
    public class EndShiftResponse
    {
        public long ShiftId { get; set; }
        public TimeOnly? ActualStartTime { get; set; }
        public TimeOnly? ActualEndTime { get; set; }
        // Patients of the shift who were not examined and are now marked NO_SHOW
        public List<long> NoShowAppointmentIds { get; set; } = new();
        // Patients waiting in the clinic: not marked, the desk moves them to another doctor
        public List<long> WaitingAppointmentIds { get; set; } = new();
        // Booked patients whose time is still to come: not marked, the desk can reschedule them
        public List<long> UpcomingAppointmentIds { get; set; } = new();
    }
}
