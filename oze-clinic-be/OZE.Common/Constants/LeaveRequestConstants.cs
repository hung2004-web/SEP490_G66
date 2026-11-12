namespace OZE.Common.Constants
{
    public static class LeaveRequestConstants
    {
        public const string Pending = "Pending";
        public const string Approved = "Approved";
        public const string Rejected = "Rejected";
        public const string Cancelled = "Cancelled";

        public static readonly string[] Statuses = { Pending, Approved, Rejected, Cancelled };

        // Part of the day the leave covers; null means the whole day
        public const string SlotMorning = "Morning";
        public const string SlotAfternoon = "Afternoon";

        public static readonly string[] Slots = { SlotMorning, SlotAfternoon };

        // A shift starting before this time belongs to the morning, otherwise to the afternoon
        public static readonly TimeOnly AfternoonStartsAt = new(12, 0);

        public const int ReasonMaxLength = 500;
    }
}
