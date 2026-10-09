namespace OZE.Common.Constants
{
    public static class RoomTypeConstants
    {
        public const string General = "General";
        public const string Imaging = "Imaging";
        public const string Treatment = "Treatment";

        public static readonly string[] AllowedTypes = { General, Imaging, Treatment };

        public static bool IsValid(string? roomType)
        {
            if (string.IsNullOrWhiteSpace(roomType))
            {
                return true; // Optional in Service entity
            }

            return AllowedTypes.Contains(roomType);
        }
    }
}
