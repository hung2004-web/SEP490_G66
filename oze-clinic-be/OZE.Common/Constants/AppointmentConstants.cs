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

        // A patient may have only one appointment that is not finished: it stays in the way until it is completed,
        // cancelled or marked NO_SHOW. Not the same as "open" in AppointmentService, which is only pending or confirmed.
        public static readonly string[] UnfinishedStatuses = { PendingStatus, ConfirmedStatus, CheckedInStatus, InServiceStatus };

        // Must match the check constraint CK_Appointments_Type
        public const string BookedType = "BOOKED";
        public const string WalkInType = "WALK_IN";
    }
}
