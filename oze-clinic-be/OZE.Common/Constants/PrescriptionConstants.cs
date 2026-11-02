namespace OZE.Common.Constants
{
    public static class PrescriptionConstants
    {
        // Must match CK_Prescriptions_Status in PrescriptionConfiguration
        public const string Draft = "Draft";
        public const string Finalized = "Finalized";

        // Must match the column lengths in PrescriptionItemConfiguration
        public const int MedicationNameMaxLength = 300;
        public const int DosageMaxLength = 100;
        public const int FrequencyMaxLength = 200;
        public const int DurationMaxLength = 100;
        public const int InstructionsMaxLength = 500;

        // The notes column has no limit, so the service enforces this one
        public const int NotesMaxLength = 500;
        // A sanity limit for the number of units of one medication
        public const int MaxQuantity = 1000;
    }
}
