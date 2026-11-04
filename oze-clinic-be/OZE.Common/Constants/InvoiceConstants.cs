namespace OZE.Common.Constants
{
    public static class InvoiceConstants
    {
        public const string Unpaid = "UNPAID";
        public const string PendingConfirmation = "PENDING_CONFIRMATION";
        public const string Paid = "PAID";
        public const string PartiallyPaid = "PARTIALLY_PAID";
        public const string PartiallyRefunded = "PARTIALLY_REFUNDED";
        public const string Refunded = "REFUNDED";
        public const string Cancelled = "CANCELLED";

        public const string NumberPrefix = "INV";

        public static readonly string[] OpenStatuses =
        {
            Unpaid,
            PendingConfirmation,
            PartiallyPaid,
            Paid,
            PartiallyRefunded,
            Refunded
        };
    }
}
