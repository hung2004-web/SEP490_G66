namespace OZE.Common.Models
{
    public class DoctorsOnDutyQuery
    {
        // Clinic day; today when omitted
        public DateOnly? Date { get; set; }
    }

    public class DoctorOnDutyResponse
    {
        // StaffProfile id, the value used as doctorId in appointment APIs
        public int DoctorId { get; set; }
        public string StaffUserId { get; set; } = string.Empty;
        public string DoctorName { get; set; } = string.Empty;
        public string? Specialization { get; set; }
        public long ShiftId { get; set; }
        public int? RoomId { get; set; }
        public string? RoomName { get; set; }
        public TimeOnly ShiftStart { get; set; }
        public TimeOnly ShiftEnd { get; set; }
        public TimeOnly? ActualStartTime { get; set; }
        public TimeOnly? ActualEndTime { get; set; }
        // NotStarted, Working, Ended, OnLeave
        public string Status { get; set; } = string.Empty;
    }

    public class MyShiftsQuery
    {
        public DateOnly? FromDate { get; set; }
        public DateOnly? ToDate { get; set; }
    }

    public static class DutyStatus
    {
        public const string NotStarted = "NotStarted";
        public const string Working = "Working";
        public const string Ended = "Ended";
        public const string OnLeave = "OnLeave";
    }
}
