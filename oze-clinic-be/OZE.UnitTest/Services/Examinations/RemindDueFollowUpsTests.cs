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
    // OZ-EXAM-24 RemindDueFollowUps
    [Trait("Tab", "OZ-EXAM-24")]
    public class RemindDueFollowUpsTests : ExaminationFollowUpTestBase
    {
        [Fact]
        public async Task RemindDueFollowUpsAsync_ShouldBatchRemindDuePatients_AndCommitDatabaseOnce()
        {
            var targetDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(1));

            var exam1 = CreateTestExamination();
            exam1.Id = 201;
            exam1.FollowUpDate = targetDate;
            exam1.FollowUpNotes = "Tái khám kiểm tra răng 1";

            var exam2 = CreateTestExamination();
            exam2.Id = 202;
            exam2.FollowUpDate = targetDate;
            exam2.FollowUpNotes = "Tái khám kiểm tra răng 2";

            var dueExams = new List<Examination> { exam1, exam2 };

            _examinationRepoMock
                .Setup(r => r.GetDueFollowUpsAsync(targetDate, It.IsAny<CancellationToken>()))
                .ReturnsAsync(dueExams);

            var savedNotifications = new List<Notification>();
            _examinationRepoMock
                .Setup(r => r.AddNotificationAsync(It.IsAny<Notification>(), It.IsAny<CancellationToken>()))
                .Callback<Notification, CancellationToken>((n, _) => savedNotifications.Add(n))
                .Returns(Task.CompletedTask);

            var result = await _service.RemindDueFollowUpsAsync(targetDate, "System_AutoWorker");

            result.Should().NotBeNull();
            result.TotalTargeted.Should().Be(2);
            result.RemindedCount.Should().Be(2);
            result.FailedCount.Should().Be(0);
            result.RemindedItems.Should().HaveCount(2);

            exam1.FollowUpReminderCount.Should().Be(1);
            exam1.FollowUpRemindedAt.Should().NotBeNull();
            exam2.FollowUpReminderCount.Should().Be(1);
            exam2.FollowUpRemindedAt.Should().NotBeNull();

            savedNotifications.Should().HaveCount(2);
            // Verify single batch save to avoid N+1 database roundtrips
            _examinationRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task RemindDueFollowUpsAsync_ShouldReturnEmpty_WhenNoDuePatients()
        {
            var targetDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(1));

            _examinationRepoMock
                .Setup(r => r.GetDueFollowUpsAsync(targetDate, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Examination>());

            var result = await _service.RemindDueFollowUpsAsync(targetDate, "System_AutoWorker");

            result.Should().NotBeNull();
            result.TotalTargeted.Should().Be(0);
            result.RemindedCount.Should().Be(0);
            result.FailedCount.Should().Be(0);
            result.RemindedItems.Should().BeEmpty();

            _examinationRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        }
    }
}
