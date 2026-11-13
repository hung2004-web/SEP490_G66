using FluentAssertions;
using Moq;
using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services.Care
{
    // OZ-PAY-08 DailyReconciliation (đối soát cuối ngày)
    [Trait("Tab", "OZ-PAY-08")]
    public class DailyReconciliationTests
    {
        private readonly Mock<ICareRepository> _repo = new();
        private readonly ReconciliationService _service;
        private readonly DateOnly _day = DateOnly.FromDateTime(ClinicClock.Today).AddDays(-1);

        public DailyReconciliationTests()
        {
            _service = new ReconciliationService(_repo.Object, new Mock<IAuditLogService>().Object);
            _repo.Setup(r => r.GetStaffNamesAsync(It.IsAny<IEnumerable<string?>>(), It.IsAny<CancellationToken>())).ReturnsAsync(new Dictionary<string, string>());
            _repo.Setup(r => r.GetPendingTransfersBeforeAsync(It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>())).ReturnsAsync(new List<PendingTransferItem>());
            _repo.Setup(r => r.GetRefundsProcessedBetweenAsync(It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>())).ReturnsAsync(new List<RefundOfDayItem>());
            GivenSessions();
            GivenPayments();
        }

        private void GivenSessions(params CashSession[] sessions) =>
            _repo.Setup(r => r.GetSessionsOpenedBetweenAsync(It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>())).ReturnsAsync(sessions.ToList());

        private void GivenPayments(params (string Method, decimal Amount)[] rows) =>
            _repo.Setup(r => r.GetConfirmedPaymentsBetweenAsync(It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync(rows.Select(x => new ConfirmedPaymentRow { PaymentMethod = x.Method, Amount = x.Amount }).ToList());

        private static CashSession Closed(decimal collected, decimal expected, decimal counted) => new()
        {
            Status = CashSessionConstants.Closed, OpenedByUserId = "lt", CashCollected = collected, ExpectedCash = expected, CountedCash = counted, Difference = counted - expected
        };

        // UTCID01 (N): totals of the day; cash taken with no drawer open is shown apart
        [Fact]
        public async Task Daily_SumsSessionsAndPayments()
        {
            GivenSessions(Closed(500, 1500, 1500), Closed(200, 700, 650));
            GivenPayments((PaymentConstants.Cash, 800), (PaymentConstants.BankTransfer, 300));

            var result = await _service.GetDailyAsync(_day);

            result.CashCollected.Should().Be(800);
            result.CashOutsideSessions.Should().Be(100);
            result.CashDifference.Should().Be(-50);
            result.TransferConfirmed.Should().Be(300);
            result.IsConfirmed.Should().BeFalse();
        }

        // UTCID02 (A): a drawer of the day still open
        [Fact]
        public async Task Confirm_OpenDrawer_Throws()
        {
            GivenSessions(new CashSession { Status = CashSessionConstants.Open, OpenedByUserId = "lt" });

            var act = () => _service.ConfirmAsync(_day, "ql", new ConfirmReconciliationRequest());

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.CareMessage.ReconciliationOpenSessions);
        }

        // UTCID03 (A): a difference needs notes
        [Fact]
        public async Task Confirm_DifferenceWithoutNotes_Throws()
        {
            GivenSessions(Closed(200, 700, 650));
            GivenPayments((PaymentConstants.Cash, 200));

            var act = () => _service.ConfirmAsync(_day, "ql", new ConfirmReconciliationRequest());

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.CareMessage.ReconciliationNoteRequired);
        }

        // UTCID04 (N): everything adds up, the day is saved
        [Fact]
        public async Task Confirm_Clean_SavesSnapshot()
        {
            GivenSessions(Closed(200, 700, 700));
            GivenPayments((PaymentConstants.Cash, 200));
            DailyReconciliation? saved = null;
            _repo.Setup(r => r.AddReconciliationAsync(It.IsAny<DailyReconciliation>(), It.IsAny<CancellationToken>())).Callback<DailyReconciliation, CancellationToken>((x, _) => saved = x);

            await _service.ConfirmAsync(_day, "ql", new ConfirmReconciliationRequest());

            saved!.ClinicDate.Should().Be(_day);
            saved.CashCollected.Should().Be(200);
            saved.ConfirmedByUserId.Should().Be("ql");
        }

        // UTCID05 (A): a future day
        [Fact]
        public async Task Confirm_FutureDay_Throws()
        {
            var act = () => _service.ConfirmAsync(_day.AddDays(5), "ql", new ConfirmReconciliationRequest());

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.CareMessage.ReconciliationFutureDate);
        }
    }
}
