using FluentAssertions;
using Moq;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services.CashSessions
{
    // OZ-CASH-01 CashSession (bàn giao ca của lễ tân)
    [Trait("Tab", "OZ-CASH-01")]
    public class CashSessionTests
    {
        private const string UserId = "letan-1";
        private const string NextUserId = "letan-2";

        private readonly Mock<ICashSessionRepository> _repo = new();
        private readonly Mock<IAuditLogService> _audit = new();
        private readonly CashSessionService _service;

        public CashSessionTests()
        {
            _service = new CashSessionService(_repo.Object, _audit.Object);
            _repo.Setup(r => r.GetStaffNamesAsync(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync(new Dictionary<string, string> { [UserId] = "Le tan 1", [NextUserId] = "Le tan 2" });
            _repo.Setup(r => r.GetActiveReceptionistsAsync(It.IsAny<CancellationToken>()))
                 .ReturnsAsync(new List<StaffOption>
                 {
                     new() { UserId = UserId, FullName = "Le tan 1" },
                     new() { UserId = NextUserId, FullName = "Le tan 2" }
                 });
            GivenPayments();
        }

        private CashSession OpenSession(decimal opening = 1_000_000m)
        {
            var session = new CashSession
            {
                Id = 7,
                OpenedByUserId = UserId,
                OpenedAt = DateTimeOffset.UtcNow.AddHours(-3),
                OpeningCash = opening,
                Status = CashSessionConstants.Open
            };
            _repo.Setup(r => r.GetOpenByUserAsync(UserId, It.IsAny<CancellationToken>())).ReturnsAsync(session);
            return session;
        }

        private void GivenPayments(params (string Method, decimal Amount)[] payments)
        {
            _repo.Setup(r => r.GetPaymentsConfirmedByAsync(UserId, It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync(payments.Select((p, i) => new CashSessionPaymentItem
                 {
                     PaymentId = i + 1,
                     InvoiceNumber = $"HD{i + 1}",
                     PaymentMethod = p.Method,
                     Amount = p.Amount
                 }).ToList());
        }

        // UTCID01 (N): open a drawer with the starting cash
        [Fact]
        public async Task Open_NoOpenSession_CreatesOpenSession()
        {
            _repo.Setup(r => r.GetOpenByUserAsync(UserId, It.IsAny<CancellationToken>())).ReturnsAsync((CashSession?)null);
            CashSession? added = null;
            _repo.Setup(r => r.AddAsync(It.IsAny<CashSession>(), It.IsAny<CancellationToken>()))
                 .Callback<CashSession, CancellationToken>((s, _) => added = s);

            var result = await _service.OpenAsync(UserId, new OpenCashSessionRequest { OpeningCash = 500_000m });

            added.Should().NotBeNull();
            added!.Status.Should().Be(CashSessionConstants.Open);
            result.OpeningCash.Should().Be(500_000m);
            result.ExpectedCash.Should().Be(500_000m);
            _repo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        // UTCID02 (A): a second open drawer for the same receptionist is refused
        [Fact]
        public async Task Open_AlreadyOpen_Throws()
        {
            OpenSession();

            var act = () => _service.OpenAsync(UserId, new OpenCashSessionRequest { OpeningCash = 0m });

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.CashSessionMessage.AlreadyOpen);
        }

        // UTCID03 (N): expected cash = opening + cash payments - expenses; transfers are not in the drawer
        [Fact]
        public async Task GetCurrent_ComputesExpectedCash()
        {
            var session = OpenSession(1_000_000m);
            session.Expenses.Add(new CashExpense { Id = 1, Amount = 130_000m, Description = "Gang tay" });
            GivenPayments((PaymentConstants.Cash, 400_000m), (PaymentConstants.Cash, 300_000m), (PaymentConstants.BankTransfer, 600_000m));

            var result = await _service.GetCurrentAsync(UserId);

            result!.CashCollected.Should().Be(700_000m);
            result.TransferConfirmed.Should().Be(600_000m);
            result.ExpenseTotal.Should().Be(130_000m);
            result.ExpectedCash.Should().Be(1_570_000m);
        }

        // UTCID04 (A): an expense larger than the cash in the drawer is refused
        [Fact]
        public async Task AddExpense_MoreThanDrawer_Throws()
        {
            OpenSession(100_000m);

            var act = () => _service.AddExpenseAsync(UserId, new AddCashExpenseRequest { Amount = 200_000m, Description = "Mua do" });

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.CashSessionMessage.ExpenseExceedsCash);
        }

        // UTCID05 (A): an expense without a description is refused
        [Fact]
        public async Task AddExpense_NoDescription_Throws()
        {
            OpenSession();

            var act = () => _service.AddExpenseAsync(UserId, new AddCashExpenseRequest { Amount = 10_000m, Description = "  " });

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.CashSessionMessage.ExpenseDescriptionRequired);
        }

        // UTCID06 (A): adding an expense without an open drawer is refused
        [Fact]
        public async Task AddExpense_NoOpenSession_Throws()
        {
            _repo.Setup(r => r.GetOpenByUserAsync(UserId, It.IsAny<CancellationToken>())).ReturnsAsync((CashSession?)null);

            var act = () => _service.AddExpenseAsync(UserId, new AddCashExpenseRequest { Amount = 10_000m, Description = "Gui xe" });

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.CashSessionMessage.NoOpenSession);
        }

        // UTCID07 (N): closing with the exact cash freezes the numbers and hands over
        [Fact]
        public async Task Close_ExactCount_ClosesAndFreezesNumbers()
        {
            var session = OpenSession(1_000_000m);
            GivenPayments((PaymentConstants.Cash, 500_000m));

            var result = await _service.CloseAsync(UserId, new CloseCashSessionRequest { CountedCash = 1_500_000m, HandoverToUserId = NextUserId });

            session.Status.Should().Be(CashSessionConstants.Closed);
            session.ExpectedCash.Should().Be(1_500_000m);
            session.Difference.Should().Be(0m);
            session.HandoverToUserId.Should().Be(NextUserId);
            result.HandoverToName.Should().Be("Le tan 2");
        }

        // UTCID08 (A): a count that differs needs a note
        [Fact]
        public async Task Close_DifferenceWithoutNote_Throws()
        {
            OpenSession(1_000_000m);

            var act = () => _service.CloseAsync(UserId, new CloseCashSessionRequest { CountedCash = 950_000m });

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.CashSessionMessage.DifferenceNoteRequired);
        }

        // UTCID09 (B): a count that differs is accepted with a note and the difference is kept
        [Fact]
        public async Task Close_DifferenceWithNote_KeepsDifference()
        {
            var session = OpenSession(1_000_000m);

            await _service.CloseAsync(UserId, new CloseCashSessionRequest { CountedCash = 950_000m, Notes = "Thoi nham tien" });

            session.Difference.Should().Be(-50_000m);
            session.Notes.Should().Be("Thoi nham tien");
        }

        // UTCID10 (A): handing over to yourself is refused
        [Fact]
        public async Task Close_HandoverToSelf_Throws()
        {
            OpenSession(0m);

            var act = () => _service.CloseAsync(UserId, new CloseCashSessionRequest { CountedCash = 0m, HandoverToUserId = UserId });

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.CashSessionMessage.HandoverInvalid);
        }

        // UTCID11 (A): a receptionist cannot read another receptionist's session
        [Fact]
        public async Task GetById_OtherReceptionist_Forbidden()
        {
            _repo.Setup(r => r.GetByIdAsync(9, It.IsAny<CancellationToken>()))
                 .ReturnsAsync(new CashSession { Id = 9, OpenedByUserId = NextUserId, Status = CashSessionConstants.Closed });

            var act = () => _service.GetByIdAsync(UserId, isManager: false, 9);

            await act.Should().ThrowAsync<ForbiddenException>();
        }
    }
}
