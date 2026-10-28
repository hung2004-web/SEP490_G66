namespace OZE.Common.Constants
{
    public static class ImagingRequestConstants
    {
        // Must match CK_ImagingRequests_Status in ImagingRequestConfiguration.
        public const string Pending = "Pending";
        public const string InProgress = "InProgress";
        public const string Completed = "Completed";
        public const string Cancelled = "Cancelled";

        // BR-190
        public const string PeriapicalXRay = "Periapical X-ray";
        public const string Panoramic = "Panoramic";
        public const string Cephalometric = "Cephalometric";
        public const string Cbct = "CBCT";
        public const string IntraoralPhoto = "Intraoral Photo";

        public static readonly string[] ImagingTypes =
        {
            PeriapicalXRay, Panoramic, Cephalometric, Cbct, IntraoralPhoto
        };

        public const int ImagingTypeMaxLength = 50;
        public const int TargetAreaMaxLength = 200;
        public const int ClinicalIndicationMaxLength = 500;
        public const int CancelReasonMaxLength = 500;

        public const string InProgressExaminationStatus = "InProgress";

        public const string NotificationTypeInApp = "InApp";
        public const string NotificationChannelInApp = "InApp";
        public const string NotificationDeliverySent = "Sent";
        public const string NotificationReferenceType = "ImagingRequest";
    }
}
