namespace OZE.Common.Constants
{
    // Customer care (follow-up and periodic recall) and payment reminders
    public static class CareConstants
    {
        // Outcome of a follow-up call made by the receptionist
        public const string OutcomeBooked = "Booked";
        public const string OutcomeCallBack = "CallBack";
        public const string OutcomeUnreachable = "Unreachable";
        public const string OutcomeDeclined = "Declined";

        public static readonly string[] Outcomes = { OutcomeBooked, OutcomeCallBack, OutcomeUnreachable, OutcomeDeclined };

        public const int RecallMaxMonths = 60;
        public const int NoteMaxLength = 500;

        // A payment reminder is not sent again within this many hours unless forced
        public const int PaymentReminderCooldownHours = 4;
        // An overdue installment is reminded automatically at most once in this many days
        public const int OverdueReminderEveryDays = 7;

        public const string ChannelSms = "SMS";
        public const string ChannelEmail = "Email";
        public const string SystemUser = "System_BackgroundService";
    }
}
