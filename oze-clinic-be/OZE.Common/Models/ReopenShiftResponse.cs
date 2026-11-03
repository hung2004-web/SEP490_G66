namespace OZE.Common.Models
{
    public class ReopenShiftResponse
    {
        public long ShiftId { get; set; }
        // Patients marked NO_SHOW by the last end of the shift, now back as they were
        public List<long> RestoredAppointmentIds { get; set; } = new();
        // Patients of that end who are no longer NO_SHOW (changed since), left as they are
        public List<long> SkippedAppointmentIds { get; set; } = new();
    }
}
