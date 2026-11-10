namespace OZE.Common.Constants
{
    public static class InstallmentConstants
    {
        // Planned period status values (T1 InstallmentPeriods) — Pending / Paid / Overdue
        public const string PeriodPending = "Pending";
        public const string PeriodPaid = "Paid";
        public const string PeriodOverdue = "Overdue";

        public static readonly string[] PeriodStatuses =
        {
            PeriodPending,
            PeriodPaid,
            PeriodOverdue
        };
    }
}
