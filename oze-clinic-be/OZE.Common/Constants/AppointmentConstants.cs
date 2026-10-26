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

        // Must match the check constraint CK_AppointmentServices_Status
        public const string ServiceRequestedStatus = "REQUESTED";
        public const string ServiceConfirmedStatus = "CONFIRMED";
        public const string ServicePerformedStatus = "PERFORMED";
        public const string ServicePostponedStatus = "POSTPONED";
        public const string ServiceCancelledStatus = "CANCELLED";
    }
}
