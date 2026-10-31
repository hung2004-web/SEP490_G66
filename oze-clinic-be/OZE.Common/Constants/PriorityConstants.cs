namespace OZE.Common.Constants
{
    // Waiting-list priority set by the receptionist; a higher level is seen first.
    // Must match the check constraint CK_Appointments_Priority in AppointmentConfiguration
    public static class PriorityConstants
    {
        public const int Normal = 0;
        // E.g. elderly, pregnant, young child, strong pain
        public const int High = 1;
        // E.g. bleeding, trauma, severe swelling
        public const int Urgent = 2;

        public static readonly int[] AllowedLevels = { Normal, High, Urgent };
    }
}
