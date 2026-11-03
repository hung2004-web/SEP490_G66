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
        public const string AppointmentExaminationStarted = "APPOINTMENT_EXAMINATION_STARTED";
        public const string AppointmentCompleted = "APPOINTMENT_COMPLETED";
        public const string AppointmentNoShow = "APPOINTMENT_NO_SHOW";
        public const string ShiftStarted = "STAFF_SHIFT_STARTED";
        public const string ShiftEnded = "STAFF_SHIFT_ENDED";
        public const string ShiftReopened = "STAFF_SHIFT_REOPENED";
        public const string AppointmentNoShowReverted = "APPOINTMENT_NO_SHOW_REVERTED";
        public const string StaffScheduleEntity = "StaffSchedule";
        public const string AppointmentEntity = "Appointment";
    }
}
