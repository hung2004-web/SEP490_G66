namespace OZE.Common.Models
{
    public class DailyInvoiceReportQuery
    {
        /// <summary>Clinic calendar date. Defaults to ClinicClock.Today when omitted.</summary>
        public DateOnly? Date { get; set; }
    }

    public class OverviewInvoiceReportQuery
    {
        /// <summary>Inclusive clinic-day start. Defaults to ClinicClock.Today when omitted.</summary>
        public DateOnly? From { get; set; }

        /// <summary>Inclusive clinic-day end. Defaults to ClinicClock.Today when omitted.</summary>
        public DateOnly? To { get; set; }
    }

    public class PaymentMethodTotal
    {
        public string PaymentMethod { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public int PaymentCount { get; set; }
    }

    public class InvoiceReportResponse
    {
        public DateOnly FromDate { get; set; }
        public DateOnly ToDate { get; set; }
        /// <summary>Clinic day used for point-in-time outstanding/due/overdue metrics.</summary>
        public DateOnly AsOfDate { get; set; }
        public int NewInvoiceCount { get; set; }
        public decimal ConfirmedCollectionsTotal { get; set; }
        public IReadOnlyList<PaymentMethodTotal> TotalsByMethod { get; set; } = Array.Empty<PaymentMethodTotal>();
        public int OpenOutstandingInvoiceCount { get; set; }
        public decimal OpenOutstandingAmount { get; set; }
        public int InstallmentDueCount { get; set; }
        public int InstallmentOverdueCount { get; set; }
    }
}
