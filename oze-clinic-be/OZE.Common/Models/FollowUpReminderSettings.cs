namespace OZE.Common.Models
{
    public class FollowUpReminderSettings
    {
        public bool Enabled { get; set; } = true;

        // The hour of the day (0-23 in clinic timezone) to send automated reminders (default 8:00 AM)
        public int RunHour { get; set; } = 8;

        // How many days ahead to remind the patient (e.g. 1 means patients with follow-up tomorrow get reminded today)
        public int DaysAhead { get; set; } = 1;

        // How often the background worker checks (in minutes)
        public int CheckIntervalMinutes { get; set; } = 30;
    }
}
