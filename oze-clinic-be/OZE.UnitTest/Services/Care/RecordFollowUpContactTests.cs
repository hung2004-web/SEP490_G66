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
    // OZ-CRM-01 RecordFollowUpContact (ghi kết quả gọi tái khám)
    [Trait("Tab", "OZ-CRM-01")]
    public class RecordFollowUpContactTests
    {
        private readonly Mock<ICareRepository> _repo = new();
        private readonly FollowUpCareService _service;
        private readonly Examination _exam = new() { Id = 5, FollowUpDate = new DateOnly(2027, 5, 1) };

        public RecordFollowUpContactTests()
        {
            _service = new FollowUpCareService(_repo.Object, new Mock<IAuditLogService>().Object);
            _repo.Setup(r => r.GetExaminationForContactAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(_exam);
            _repo.Setup(r => r.GetStaffNamesAsync(It.IsAny<IEnumerable<string?>>(), It.IsAny<CancellationToken>())).ReturnsAsync(new Dictionary<string, string> { ["lt"] = "Le tan" });
        }

        // UTCID01 (N): Declined is stored and closes the follow-up
        [Fact]
        public async Task Declined_ClosesFollowUp()
        {
            var result = await _service.RecordContactAsync(5, "lt", new RecordFollowUpContactRequest { Outcome = "declined", Note = "Chuyen noi khac" });

            result.Outcome.Should().Be(CareConstants.OutcomeDeclined);
            result.CreatedByName.Should().Be("Le tan");
            _exam.FollowUpClosed.Should().BeTrue();
            _exam.FollowUpContacts.Should().HaveCount(1);
        }

        // UTCID02 (N): a later call that is not Declined reopens it
        [Fact]
        public async Task Unreachable_KeepsFollowUpOpen()
        {
            _exam.FollowUpClosed = true;

            await _service.RecordContactAsync(5, "lt", new RecordFollowUpContactRequest { Outcome = "Unreachable" });

            _exam.FollowUpClosed.Should().BeFalse();
        }

        // UTCID03 (A): CallBack needs a day from today on
        [Fact]
        public async Task CallBack_WithoutDate_Throws()
        {
            var act = () => _service.RecordContactAsync(5, "lt", new RecordFollowUpContactRequest { Outcome = "CallBack" });

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.CareMessage.CallBackDateRequired);
        }

        // UTCID04 (A): unknown outcome
        [Fact]
        public async Task UnknownOutcome_Throws()
        {
            var act = () => _service.RecordContactAsync(5, "lt", new RecordFollowUpContactRequest { Outcome = "Maybe" });

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.CareMessage.OutcomeInvalid);
        }

        // UTCID05 (A): an examination without follow-up
        [Fact]
        public async Task NoFollowUp_Throws()
        {
            _exam.FollowUpDate = null;

            var act = () => _service.RecordContactAsync(5, "lt", new RecordFollowUpContactRequest { Outcome = "Booked" });

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.CareMessage.NoFollowUp);
        }
    }
}
