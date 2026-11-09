namespace OZE.Common.Constants
{
    public static class PaymentConstants
    {
        // Must match CK_Payments_Status in PaymentConfiguration
        public const string Pending = "PENDING";
        public const string Confirmed = "CONFIRMED";
        public const string Failed = "FAILED";
        public const string Refunded = "REFUNDED";

        public static readonly string[] Statuses =
        {
            Pending,
            Confirmed,
            Failed,
            Refunded
        };

        // Must match CK_Payments_PaymentMethod in PaymentConfiguration
        public const string Cash = "CASH";
        public const string BankTransfer = "BANK_TRANSFER";
        public const string QrTransfer = "QR_TRANSFER";

        public static readonly string[] Methods =
        {
            Cash,
            BankTransfer,
            QrTransfer
        };

        // Planned CK_Payments_Purpose (T1): Deposit | Regular | Installment — AD-2
        public const string PurposeDeposit = "Deposit";
        public const string PurposeRegular = "Regular";
        public const string PurposeInstallment = "Installment";

        public static readonly string[] Purposes =
        {
            PurposeDeposit,
            PurposeRegular,
            PurposeInstallment
        };

        // Must match CK_RefundAdjustments_Type
        public static class RefundRequestType
        {
            public const string Refund = "Refund";
            public const string Adjustment = "Adjustment";

            public static readonly string[] All = { Refund, Adjustment };
        }

        // Must match CK_RefundAdjustments_Status
        public static class RefundRequestStatus
        {
            public const string Pending = "Pending";
            public const string Approved = "Approved";
            public const string Rejected = "Rejected";
            public const string Processed = "Processed";

            public static readonly string[] All =
            {
                Pending,
                Approved,
                Rejected,
                Processed
            };
        }
    }
}
