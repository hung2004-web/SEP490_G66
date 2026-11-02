namespace OZE.Common.Constants
{
    public static class QueueConstants
    {
        // Must match CK_QueueEntries_QueueType in QueueEntryConfiguration.
        public const string ExaminationType = "Examination";
        public const string ImagingType = "Imaging";
        public const string TreatmentType = "Treatment";

        // Must match CK_QueueEntries_Status in QueueEntryConfiguration.
        public const string Waiting = "WAITING";
        public const string Called = "CALLED";
        public const string InProgress = "IN_PROGRESS";
        public const string Completed = "COMPLETED";
        public const string Skipped = "SKIPPED";
        public const string Cancelled = "CANCELLED";

        // Still on the board: waiting, called or being served
        public static readonly string[] ActiveStatuses = { Waiting, Called, InProgress };

        // Queue numbers are handed out one at a time per queue and day
        public const string NumberLockPrefix = "queue-number:";
        public const int NumberLockTimeoutMilliseconds = 10000;

        // The public board shows only the first letter of each word of the patient's name
        public const char MaskCharacter = '*';
        public const int MaskedLength = 3;
    }
}
