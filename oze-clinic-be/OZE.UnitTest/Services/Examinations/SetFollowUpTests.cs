using FluentAssertions;
using Moq;
using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models.Base;
using OZE.Common.Models;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services.Examinations
{
    // OZ-EXAM-21 SetFollowUp
    [Trait("Tab", "OZ-EXAM-21")]
    public class SetFollowUpTests : ExaminationFollowUpTestBase
    {
        [Fact]
        public async Task SetFollowUpAsync_ShouldSaveFollowUpDateAndNotes_WhenValid()
        {
            var exam = CreateTestExamination();
            _examinationRepoMock
                .Setup(r => r.GetForWorkAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(exam);
            _examinationRepoMock
                .Setup(r => r.GetEarlierChartEntriesAsync(It.IsAny<int>(), It.IsAny<DateTimeOffset>(), It.IsAny<long>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<DentalChartEntry>());

            var futureDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(7));
            var request = new SaveFollowUpRequest
            {
                FollowUpDate = futureDate,
                FollowUpNotes = "Tái khám kiểm tra tủy sau 7 ngày"
            };

            var result = await _service.SetFollowUpAsync(DoctorUserId, ExaminationId, request);

            result.Should().NotBeNull();
            exam.FollowUpDate.Should().Be(futureDate);
            exam.FollowUpNotes.Should().Be("Tái khám kiểm tra tủy sau 7 ngày");
            _examinationRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
            _auditLogMock.Verify(a => a.LogAsync(
                AuditConstants.ExaminationFollowUpSet,
                AuditConstants.ExaminationEntity,
                ExaminationId.ToString(),
                It.IsAny<object?>(),
                It.IsAny<object?>(),
                It.IsAny<string?>()), Times.Once);
        }

        [Fact]
        public async Task SetFollowUpAsync_ShouldThrowBadRequest_WhenDateIsInPast()
        {
            var exam = CreateTestExamination();
            _examinationRepoMock
                .Setup(r => r.GetForWorkAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(exam);

            var pastDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(-1));
            var request = new SaveFollowUpRequest { FollowUpDate = pastDate };

            var act = () => _service.SetFollowUpAsync(DoctorUserId, ExaminationId, request);

            (await act.Should().ThrowAsync<BadRequestException>())
                .WithMessage(ErrorConstants.ExaminationMessage.FollowUpDateMustBeFuture);
        }

        [Fact]
        public async Task SetFollowUpAsync_ShouldThrowForbidden_WhenNotAssignedDoctor()
        {
            var exam = CreateTestExamination(doctorId: 999);
            _examinationRepoMock
                .Setup(r => r.GetForWorkAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(exam);

            var request = new SaveFollowUpRequest { FollowUpDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(5)) };

            var act = () => _service.SetFollowUpAsync(DoctorUserId, ExaminationId, request);

            await act.Should().ThrowAsync<ForbiddenException>();
        }
    }
}
