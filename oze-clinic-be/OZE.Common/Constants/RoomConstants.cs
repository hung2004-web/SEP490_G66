namespace OZE.Common.Constants
{
    public static class RoomConstants
    {
        // Must match the check constraints CK_Rooms_RoomType and CK_Rooms_Status in RoomConfiguration
        public static readonly string[] RoomTypes = { "General", "Imaging", "Treatment" };
        public static readonly string[] Statuses = { "Active", "Maintenance", "Inactive" };

        public const string ActiveStatus = "Active";
        public const string InactiveStatus = "Inactive";
    }
}
