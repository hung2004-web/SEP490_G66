namespace OZE.Common.Constants
{
    public static class AppointmentConstants
    {
        // Must match the check constraint CK_Appointments_Status in AppointmentConfiguration
        public const string CancelledStatus = "CANCELLED";
        public const string NoShowStatus = "NO_SHOW";
    }
}
