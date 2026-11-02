namespace OZE.Common.Constants
{
    public static class ExaminationConstants
    {
        // Must match the check constraint CK_Examinations_Status
        public const string InProgress = "InProgress";
        public const string Completed = "Completed";
        public const string Locked = "Locked";

        // Limits of the free text fields. The database columns have no limit, so the service enforces these.
        public const int ChiefComplaintMaxLength = 500;
        public const int ClinicalNotesMaxLength = 2000;
        // Must match the column lengths in ClinicalDiagnosisConfiguration
        public const int DiagnosisCodeMaxLength = 20;
        public const int DiagnosisNameMaxLength = 300;
        public const int DiagnosisDescriptionMaxLength = 1000;
    }
}
