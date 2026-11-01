namespace OZE.Common.Constants
{
    public static class AppointmentConstants
    {
        // Must match the check constraint CK_Appointments_Status in AppointmentConfiguration
        public const string CancelledStatus = "CANCELLED";
        public const string NoShowStatus = "NO_SHOW";
        public const string PendingStatus = "PENDING";
        public const string ConfirmedStatus = "CONFIRMED";
        public const string CheckedInStatus = "CHECKED_IN";
        public const string InServiceStatus = "IN_SERVICE";
        public const string CompletedStatus = "COMPLETED";

        // Must match the check constraint CK_Appointments_Type
        public const string BookedType = "BOOKED";
        public const string WalkInType = "WALK_IN";
    }
}
