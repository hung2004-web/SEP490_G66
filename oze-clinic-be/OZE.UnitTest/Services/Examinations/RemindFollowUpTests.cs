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
    // OZ-EXAM-22 RemindFollowUp
    [Trait("Tab", "OZ-EXAM-22")]
    public class RemindFollowUpTests : ExaminationFollowUpTestBase
    {
        [Fact]
        public async Task RemindFollowUpAsync_ShouldSendNotificationAndIncrementCount()
        {
            var exam = CreateTestExamination();
            exam.FollowUpDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(3));
            exam.FollowUpNotes = "Tái khám cắt chỉ";

            _examinationRepoMock
                .Setup(r => r.GetByIdWithFollowUpAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(exam);

            Notification? savedNotification = null;
            _examinationRepoMock
                .Setup(r => r.AddNotificationAsync(It.IsAny<Notification>(), It.IsAny<CancellationToken>()))
                .Callback<Notification, CancellationToken>((n, _) => savedNotification = n)
                .Returns(Task.CompletedTask);

            var result = await _service.RemindFollowUpAsync("staff-1", ExaminationId);

            result.Should().NotBeNull();
            result.ReminderCount.Should().Be(1);
            result.LastRemindedAt.Should().NotBeNull();
            exam.FollowUpReminderCount.Should().Be(1);
            savedNotification.Should().NotBeNull();
            savedNotification!.UserId.Should().Be("patient-user-1");
            savedNotification.Message.Should().Contain("Tái khám cắt chỉ");
            _examinationRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task RemindFollowUpAsync_ShouldThrowBadRequest_WhenNoFollowUpSet()
        {
            var exam = CreateTestExamination();
            exam.FollowUpDate = null;
            exam.FollowUpAppointmentId = null;

            _examinationRepoMock
                .Setup(r => r.GetByIdWithFollowUpAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(exam);

            var act = () => _service.RemindFollowUpAsync("staff-1", ExaminationId);

            (await act.Should().ThrowAsync<BadRequestException>())
                .WithMessage(ErrorConstants.ExaminationMessage.FollowUpNotSet);
        }

        [Fact]
        public async Task RemindFollowUpAsync_ShouldThrowBadRequest_WhenSentWithinCooldown()
        {
            var exam = CreateTestExamination();
            exam.FollowUpDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(3));
            exam.FollowUpRemindedAt = DateTimeOffset.UtcNow.AddMinutes(-30); // 30 mins ago (< 4 hours)

            _examinationRepoMock
                .Setup(r => r.GetByIdWithFollowUpAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(exam);

            var act = () => _service.RemindFollowUpAsync("staff-1", ExaminationId, force: false);

            await act.Should().ThrowAsync<BadRequestException>()
                .WithMessage("*recently*");
        }

        [Fact]
        public async Task RemindFollowUpAsync_ShouldSucceed_WhenForceIsTrueEvenWithinCooldown()
        {
            var exam = CreateTestExamination();
            exam.FollowUpDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(3));
            exam.FollowUpRemindedAt = DateTimeOffset.UtcNow.AddMinutes(-30);

            _examinationRepoMock
                .Setup(r => r.GetByIdWithFollowUpAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(exam);

            var result = await _service.RemindFollowUpAsync("staff-1", ExaminationId, force: true);

            result.Should().NotBeNull();
            exam.FollowUpReminderCount.Should().Be(1);
        }
    }
}
