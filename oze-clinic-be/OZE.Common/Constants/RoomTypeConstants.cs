namespace OZE.Common.Constants
{
    public static class RoomTypeConstants
    {
        public const string General = "General";
        public const string Imaging = "Imaging";
        public const string Treatment = "Treatment";
        // Minor surgery: invasive procedures that need a sterile room, e.g. wisdom tooth extraction, implant
        public const string Surgery = "Surgery";

        public static readonly string[] AllowedTypes = { General, Imaging, Treatment, Surgery };

        public static bool IsValid(string? roomType)
        {
            if (string.IsNullOrWhiteSpace(roomType))
            {
                return true; // Optional in Service entity
            }

            return AllowedTypes.Any(t => string.Equals(t, roomType.Trim(), StringComparison.OrdinalIgnoreCase));
        }

        public static bool TryNormalize(string? roomType, out string? normalized)
        {
            if (string.IsNullOrWhiteSpace(roomType))
            {
                normalized = null;
                return true;
            }

            var trimmed = roomType.Trim();
            var matched = AllowedTypes.FirstOrDefault(t => string.Equals(t, trimmed, StringComparison.OrdinalIgnoreCase));
            if (matched != null)
            {
                normalized = matched;
                return true;
            }

            normalized = null;
            return false;
        }
    }
}
