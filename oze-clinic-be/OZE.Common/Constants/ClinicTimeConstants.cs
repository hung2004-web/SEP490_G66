namespace OZE.Common.Constants
{
    public static class ClinicTimeConstants
    {
        // The clinic works in Vietnam time; the server may run in another zone (often UTC)
        public const string WindowsTimeZoneId = "SE Asia Standard Time";
        public const string IanaTimeZoneId = "Asia/Ho_Chi_Minh";
        public const int UtcOffsetHours = 7;
    }
}
