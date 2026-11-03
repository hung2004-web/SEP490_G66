using OZE.Common.Constants;

namespace OZE.Application.Helpers
{
    // The current date and time at the clinic. Use it instead of DateTime.Now / DateTime.Today,
    // which follow the zone of the server
    public static class ClinicClock
    {
        private static readonly TimeZoneInfo Zone = ResolveZone();

        public static DateTime Now => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Zone);

        public static DateTime Today => Now.Date;

        private static TimeZoneInfo ResolveZone()
        {
            foreach (var id in new[] { ClinicTimeConstants.IanaTimeZoneId, ClinicTimeConstants.WindowsTimeZoneId })
            {
                try
                {
                    return TimeZoneInfo.FindSystemTimeZoneById(id);
                }
                catch (TimeZoneNotFoundException)
                {
                }
                catch (InvalidTimeZoneException)
                {
                }
            }

            return TimeZoneInfo.CreateCustomTimeZone(ClinicTimeConstants.IanaTimeZoneId,
                TimeSpan.FromHours(ClinicTimeConstants.UtcOffsetHours), ClinicTimeConstants.IanaTimeZoneId, ClinicTimeConstants.IanaTimeZoneId);
        }
    }
}
