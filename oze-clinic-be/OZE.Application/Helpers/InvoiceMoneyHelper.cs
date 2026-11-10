using OZE.Common.Constants;
using OZE.Domain.Entities;

namespace OZE.Application.Helpers
{
    public static class InvoiceMoneyHelper
    {
        public static decimal GetConfirmedSum(Invoice invoice) =>
            decimal.Round(
                invoice.Payments
                    .Where(p => p.PaymentStatus == PaymentConstants.Confirmed)
                    .Sum(p => p.Amount),
                2,
                MidpointRounding.AwayFromZero);

        public static decimal GetRefundedSum(Invoice invoice) =>
            decimal.Round(
                invoice.RefundAdjustmentRequests
                    .Where(r =>
                        r.RequestType == PaymentConstants.RefundRequestType.Refund
                        && (r.Status == PaymentConstants.RefundRequestStatus.Approved
                            || r.Status == PaymentConstants.RefundRequestStatus.Processed))
                    .Sum(r => r.Amount),
                2,
                MidpointRounding.AwayFromZero);

        public static decimal GetNetPaidAmount(Invoice invoice) =>
            decimal.Round(Math.Max(0m, GetConfirmedSum(invoice) - GetRefundedSum(invoice)), 2, MidpointRounding.AwayFromZero);

        public static decimal GetRemaining(Invoice invoice) =>
            decimal.Round(Math.Max(0m, invoice.FinalAmount - GetNetPaidAmount(invoice)), 2, MidpointRounding.AwayFromZero);

        /// <summary>
        /// Open-P3: keep payment rows; PaidAmount = confirmed − refunded; status reflects refund when any.
        /// </summary>
        public static void Recalculate(Invoice invoice)
        {
            if (invoice.PaymentStatus == InvoiceConstants.Cancelled)
            {
                return;
            }

            var confirmedSum = GetConfirmedSum(invoice);
            var refundedSum = GetRefundedSum(invoice);
            var netPaid = decimal.Round(Math.Max(0m, confirmedSum - refundedSum), 2, MidpointRounding.AwayFromZero);
            invoice.PaidAmount = netPaid;

            var hasPending = invoice.Payments.Any(p => p.PaymentStatus == PaymentConstants.Pending);

            if (refundedSum > 0)
            {
                invoice.PaymentStatus = netPaid <= 0
                    ? InvoiceConstants.Refunded
                    : InvoiceConstants.PartiallyRefunded;
                return;
            }

            if (netPaid <= 0)
            {
                invoice.PaymentStatus = hasPending
                    ? InvoiceConstants.PendingConfirmation
                    : InvoiceConstants.Unpaid;
                return;
            }

            if (netPaid >= invoice.FinalAmount)
            {
                invoice.PaymentStatus = InvoiceConstants.Paid;
                return;
            }

            invoice.PaymentStatus = InvoiceConstants.PartiallyPaid;
        }
    }
}
