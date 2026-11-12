using FluentAssertions;
using Moq;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services.Care
{
    // OZ-CRM-05 ConsultationRequest (yêu cầu tư vấn)
    [Trait("Tab", "OZ-CRM-05")]
    public class ConsultationRequestTests
    {
        private readonly Mock<IConsultationRepository> _repo = new();
        private readonly Mock<ICareRepository> _care = new();
        private readonly ConsultationService _service;

        public ConsultationRequestTests()
        {
            _service = new ConsultationService(_repo.Object, _care.Object, new Mock<IAuditLogService>().Object);
            _care.Setup(r => r.GetStaffNamesAsync(It.IsAny<IEnumerable<string?>>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync(new Dictionary<string, string> { ["lt"] = "Le tan" });
        }

        // UTCID01 (N): a visitor's request is saved as New with the phone normalized
        [Fact]
        public async Task Create_SavesNew()
        {
            ConsultationRequest? saved = null;
            _repo.Setup(r => r.AddAsync(It.IsAny<ConsultationRequest>(), It.IsAny<CancellationToken>())).Callback<ConsultationRequest, CancellationToken>((x, _) => saved = x);

            var result = await _service.CreateAsync(new CreateConsultationRequest { FullName = " Tran B ", PhoneNumber = "0912345678", Note = "Nieng rang" });

            saved!.Status.Should().Be(ConsultationService.New);
            saved.FullName.Should().Be("Tran B");
            result.Note.Should().Be("Nieng rang");
        }

        // UTCID02 (A): the same phone a few minutes later
        [Fact]
        public async Task Create_Repeated_Throws()
        {
            _repo.Setup(r => r.HasRecentNewAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);

            var act = () => _service.CreateAsync(new CreateConsultationRequest { FullName = "Tran B", PhoneNumber = "0912345678" });

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.ConsultationMessage.AlreadySent);
        }

        // UTCID03 (A): an invalid phone
        [Fact]
        public async Task Create_BadPhone_Throws()
        {
            var act = () => _service.CreateAsync(new CreateConsultationRequest { FullName = "Tran B", PhoneNumber = "abc" });

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.AuthMessage.InvalidPhone);
        }

        // UTCID04 (N): the receptionist records the call
        [Fact]
        public async Task Handle_SetsStatusAndHandler()
        {
            var entity = new ConsultationRequest { Id = 3, Status = ConsultationService.New };
            _repo.Setup(r => r.GetByIdAsync(3, It.IsAny<CancellationToken>())).ReturnsAsync(entity);

            var result = await _service.HandleAsync(3, "lt", new HandleConsultationRequest { Status = "booked", Note = "Dat lich 15/11" });

            entity.Status.Should().Be(ConsultationService.Booked);
            result.HandledByName.Should().Be("Le tan");
            result.HandleNote.Should().Be("Dat lich 15/11");
        }

        // UTCID05 (A): a status the receptionist cannot set
        [Fact]
        public async Task Handle_BadStatus_Throws()
        {
            _repo.Setup(r => r.GetByIdAsync(3, It.IsAny<CancellationToken>())).ReturnsAsync(new ConsultationRequest { Id = 3 });

            var act = () => _service.HandleAsync(3, "lt", new HandleConsultationRequest { Status = "New" });

            await act.Should().ThrowAsync<BadRequestException>().WithMessage(ErrorConstants.ConsultationMessage.StatusInvalid);
        }
    }
}
