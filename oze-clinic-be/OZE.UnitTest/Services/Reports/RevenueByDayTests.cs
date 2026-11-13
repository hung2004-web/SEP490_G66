using FluentAssertions;
using Moq;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using Xunit;

namespace OZE.UnitTest.Services.Reports
{
    // OZ-RPT-01 RevenueByDay (biểu đồ doanh thu theo ngày)
    [Trait("Tab", "OZ-RPT-01")]
    public class RevenueByDayTests
    {
        private readonly Mock<IInvoiceReportRepository> _repo = new();
        private readonly InvoiceReportService _service;

        public RevenueByDayTests()
        {
            _service = new InvoiceReportService(_repo.Object);
        }

        // UTCID01 (N): payments are split into cash and transfer per clinic day, empty days are zero
        [Fact]
        public async Task Series_GroupsByClinicDay()
        {
            var from = new DateOnly(2026, 11, 9);
            var to = new DateOnly(2026, 11, 11);
            _repo.Setup(r => r.GetConfirmedPaymentsAsync(It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync(new List<ConfirmedPaymentRow>
                 {
                     // 23:30 on 09/11 in Vietnam is 16:30 UTC, it must count for 09/11
                     new() { PaymentMethod = PaymentConstants.Cash, Amount = 100_000m, PaidAt = new DateTimeOffset(2026, 11, 9, 16, 30, 0, TimeSpan.Zero) },
                     new() { PaymentMethod = PaymentConstants.BankTransfer, Amount = 300_000m, PaidAt = new DateTimeOffset(2026, 11, 11, 2, 0, 0, TimeSpan.Zero) },
                     new() { PaymentMethod = PaymentConstants.QrTransfer, Amount = 50_000m, PaidAt = new DateTimeOffset(2026, 11, 11, 3, 0, 0, TimeSpan.Zero) }
                 });

            var result = await _service.GetRevenueSeriesAsync(new RevenueSeriesQuery { From = from, To = to });

            result.Days.Should().HaveCount(3);
            result.Days[0].Cash.Should().Be(100_000m);
            result.Days[1].Total.Should().Be(0m);
            result.Days[2].Transfer.Should().Be(350_000m);
            result.Total.Should().Be(450_000m);
        }

        // UTCID02 (A): more than 31 days is refused
        [Fact]
        public async Task Series_TooLong_Throws()
        {
            var act = () => _service.GetRevenueSeriesAsync(new RevenueSeriesQuery { From = new DateOnly(2026, 10, 1), To = new DateOnly(2026, 11, 11) });

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.ReportMessage.SeriesRangeTooLarge);
        }
    }
}
