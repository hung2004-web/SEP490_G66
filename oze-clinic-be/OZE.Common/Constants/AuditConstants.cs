namespace OZE.Common.Constants
{
    public static class AuditConstants
    {
        // Action is at most 50 characters, see AuditLogConfiguration
        public const string AppointmentCreated = "APPOINTMENT_CREATED";
        public const string AppointmentConfirmed = "APPOINTMENT_CONFIRMED";
        public const string AppointmentCancelled = "APPOINTMENT_CANCELLED";
        public const string AppointmentCheckedIn = "APPOINTMENT_CHECKED_IN";
        public const string AppointmentRescheduled = "APPOINTMENT_RESCHEDULED";
        public const string AppointmentPriorityChanged = "APPOINTMENT_PRIORITY_CHANGED";

        public const string AppointmentEntity = "Appointment";
    }
}
