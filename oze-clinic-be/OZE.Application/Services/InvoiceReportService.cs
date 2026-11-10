using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Middlewares;
using OZE.Common.Constants;
using OZE.Common.Models;

namespace OZE.Application.Services
{
    public class InvoiceReportService : IInvoiceReportService
    {
        private readonly IInvoiceReportRepository _reportRepository;

        public InvoiceReportService(IInvoiceReportRepository reportRepository)
        {
            _reportRepository = reportRepository;
        }

        public async Task<InvoiceReportResponse> GetDailyAsync(
            DailyInvoiceReportQuery query,
            CancellationToken cancellationToken = default)
        {
            var date = query.Date ?? DateOnly.FromDateTime(ClinicClock.Today);
            return await BuildReportAsync(date, date, asOfDate: date, cancellationToken);
        }

        public async Task<InvoiceReportResponse> GetOverviewAsync(
            OverviewInvoiceReportQuery query,
            CancellationToken cancellationToken = default)
        {
            var today = DateOnly.FromDateTime(ClinicClock.Today);
            var from = query.From ?? today;
            var to = query.To ?? today;
            ConditionGuard.Ensure(from <= to, ErrorConstants.ReportMessage.DateRangeInvalid);
            ConditionGuard.Ensure(
                to.DayNumber - from.DayNumber <= 366,
                ErrorConstants.ReportMessage.DateRangeTooLarge);

            // Point-in-time ops metrics use clinic today; range metrics use [from, to].
            return await BuildReportAsync(from, to, asOfDate: today, cancellationToken);
        }

        private async Task<InvoiceReportResponse> BuildReportAsync(
            DateOnly fromDate,
            DateOnly toDate,
            DateOnly asOfDate,
            CancellationToken cancellationToken)
        {
            var (rangeStart, _) = ClinicDayWindow(fromDate);
            var (_, rangeEnd) = ClinicDayWindow(toDate);

            var newInvoiceCount = await _reportRepository.CountNewInvoicesAsync(
                rangeStart,
                rangeEnd,
                cancellationToken);

            var totalsByMethod = await _reportRepository.SumConfirmedPaymentsByMethodAsync(
                rangeStart,
                rangeEnd,
                cancellationToken);

            var (outstandingCount, outstandingAmount) = await _reportRepository.GetOpenOutstandingAsync(
                cancellationToken);

            var (dueCount, overdueCount) = await _reportRepository.CountInstallmentDueOverdueAsync(
                asOfDate,
                cancellationToken);

            var collectionsTotal = decimal.Round(
                totalsByMethod.Sum(x => x.Amount),
                2,
                MidpointRounding.AwayFromZero);

            return new InvoiceReportResponse
            {
                FromDate = fromDate,
                ToDate = toDate,
                AsOfDate = asOfDate,
                NewInvoiceCount = newInvoiceCount,
                ConfirmedCollectionsTotal = collectionsTotal,
                TotalsByMethod = totalsByMethod,
                OpenOutstandingInvoiceCount = outstandingCount,
                OpenOutstandingAmount = outstandingAmount,
                InstallmentDueCount = dueCount,
                InstallmentOverdueCount = overdueCount
            };
        }

        /// <summary>
        /// Clinic calendar day [start, end) in +07 offset so UTC timestamps compare correctly.
        /// </summary>
        private static (DateTimeOffset Start, DateTimeOffset EndExclusive) ClinicDayWindow(DateOnly date)
        {
            var offset = TimeSpan.FromHours(ClinicTimeConstants.UtcOffsetHours);
            var start = new DateTimeOffset(date.ToDateTime(TimeOnly.MinValue), offset);
            return (start, start.AddDays(1));
        }
    }
}
