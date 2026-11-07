namespace OZE.Common.Constants
{
    public static class RoomConstants
    {
        public const string ActiveStatus = "Active";
        public const string MaintenanceStatus = "Maintenance";
        public const string InactiveStatus = "Inactive";

        // Must match the check constraints CK_Rooms_RoomType and CK_Rooms_Status in RoomConfiguration
        public static readonly string[] RoomTypes = RoomTypeConstants.AllowedTypes;
        public static readonly string[] Statuses = { ActiveStatus, MaintenanceStatus, InactiveStatus };
    }
}
