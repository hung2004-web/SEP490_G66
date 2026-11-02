namespace OZE.Common.Constants
{
    public static class DentalChartConstants
    {
        // The state of a tooth. Healthy is how a tooth is recorded as back to normal.
        public const string Healthy = "Healthy";
        public const string Caries = "Caries";
        public const string Filled = "Filled";
        public const string Crown = "Crown";
        public const string Missing = "Missing";
        public const string Denture = "Denture";
        public const string Implant = "Implant";

        public static readonly string[] Conditions = { Healthy, Caries, Filled, Crown, Missing, Denture, Implant };

        // Must match the column lengths in DentalChartEntryConfiguration
        public const int ToothNumberMaxLength = 5;
        public const int SurfaceMaxLength = 10;
        public const int SeverityMaxLength = 20;
        // The notes column has no limit, so the service enforces this one
        public const int NotesMaxLength = 500;

        // FDI numbering: the first digit is the quadrant, the second is the tooth in it.
        // Quadrants 1-4 hold the permanent teeth (1-8), quadrants 5-8 hold the baby teeth (1-5).
        public const int LastPermanentQuadrant = 4;
        public const int PermanentTeethPerQuadrant = 8;
        public const int LastBabyToothQuadrant = 8;
        public const int BabyTeethPerQuadrant = 5;
    }
}
