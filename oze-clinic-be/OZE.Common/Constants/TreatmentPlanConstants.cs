namespace OZE.Common.Constants
{
    public static class TreatmentPlanConstants
    {
        // Must match CK_TreatmentPlans_Status in TreatmentPlanConfiguration
        public const string Draft = "Draft";
        public const string Proposed = "Proposed";
        public const string Approved = "Approved";
        public const string InProgress = "InProgress";
        public const string Completed = "Completed";
        public const string Cancelled = "Cancelled";
        public const string Superseded = "Superseded";

        public static readonly string[] PlanStatuses =
        {
            Draft, Proposed, Approved, InProgress, Completed, Cancelled, Superseded
        };

        // Must match CK_TreatmentPlanStages_Status in TreatmentPlanStageConfiguration
        // Stored without space (InProgress) to match existing DB check constraints.
        public static class StageStatus
        {
            public const string Scheduled = "Scheduled";
            public const string InProgress = "InProgress";
            public const string Completed = "Completed";
            public const string Cancelled = "Cancelled";

            public static readonly string[] All = { Scheduled, InProgress, Completed, Cancelled };
        }
    }
}
