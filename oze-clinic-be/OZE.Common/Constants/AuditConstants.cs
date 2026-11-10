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
        public const string AppointmentDoctorReassigned = "APPOINTMENT_DOCTOR_REASSIGNED";
        public const string ShiftStarted = "STAFF_SHIFT_STARTED";
        public const string ShiftEnded = "STAFF_SHIFT_ENDED";
        public const string ShiftReopened = "STAFF_SHIFT_REOPENED";
        public const string AppointmentNoShowReverted = "APPOINTMENT_NO_SHOW_REVERTED";
        public const string StaffScheduleEntity = "StaffSchedule";
        public const string AppointmentEntity = "Appointment";
        public const string ExaminationEntity = "Examination";

        public const string InvoiceEntity = "Invoice";
        public const string PaymentEntity = "Payment";
        public const string RefundRequestEntity = "RefundAdjustmentRequest";
        public const string InstallmentPlanEntity = "InstallmentPlan";
        public const string InstallmentPeriodEntity = "InstallmentPeriod";

        public const string InvoiceCreated = "INVOICE_CREATED";
        public const string InvoiceUpdated = "INVOICE_UPDATED";
        public const string InvoiceCancelled = "INVOICE_CANCELLED";

        public const string PaymentRecorded = "PAYMENT_RECORDED";
        public const string PaymentConfirmed = "PAYMENT_CONFIRMED";
        public const string PaymentVoided = "PAYMENT_VOIDED";

        public const string RefundRequested = "REFUND_REQUESTED";
        public const string RefundWorkDoneSet = "REFUND_WORK_DONE_SET";
        public const string RefundApproved = "REFUND_APPROVED";
        public const string RefundRejected = "REFUND_REJECTED";
        public const string RefundProcessed = "REFUND_PROCESSED";

        public const string InstallmentPlanCreated = "INSTALLMENT_PLAN_CREATED";
        public const string InstallmentPeriodPaid = "INSTALLMENT_PERIOD_PAID";

        public const string ExaminationFollowUpSet = "EXAMINATION_FOLLOW_UP_SET";
        public const string AppointmentFollowUpScheduled = "APPOINTMENT_FOLLOW_UP_SCHEDULED";
        public const string FollowUpReminded = "FOLLOW_UP_REMINDED";
    }
}
