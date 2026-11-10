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
    // OZ-EXAM-23 ScheduleFollowUpAppointment
    [Trait("Tab", "OZ-EXAM-23")]
    public class ScheduleFollowUpAppointmentTests : ExaminationFollowUpTestBase
    {
        [Fact]
        public async Task ScheduleFollowUpAppointmentAsync_ShouldDelegateToAppointmentService()
        {
            var exam = CreateTestExamination();
            _examinationRepoMock
                .Setup(r => r.GetByIdWithFollowUpAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(exam);

            var request = new ScheduleFollowUpRequest
            {
                Date = DateOnly.FromDateTime(ClinicClock.Today.AddDays(7)),
                SlotStart = new TimeOnly(9, 0)
            };

            _appointmentServiceMock
                .Setup(s => s.ScheduleFollowUpAsync(exam.AppointmentId, request, "staff-1", It.IsAny<CancellationToken>()))
                .ReturnsAsync(new AppointmentResponse { Id = 300 });

            var result = await _service.ScheduleFollowUpAppointmentAsync("staff-1", ExaminationId, request);

            result.Should().NotBeNull();
            result.Id.Should().Be(300);
            _appointmentServiceMock.Verify(s => s.ScheduleFollowUpAsync(exam.AppointmentId, request, "staff-1", It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task ScheduleFollowUpAppointmentAsync_ShouldThrowBadRequest_WhenAlreadyScheduled()
        {
            var exam = CreateTestExamination();
            exam.FollowUpAppointmentId = 250;

            _examinationRepoMock
                .Setup(r => r.GetByIdWithFollowUpAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(exam);

            var request = new ScheduleFollowUpRequest
            {
                Date = DateOnly.FromDateTime(ClinicClock.Today.AddDays(7)),
                SlotStart = new TimeOnly(9, 0)
            };

            var act = () => _service.ScheduleFollowUpAppointmentAsync("staff-1", ExaminationId, request);

            (await act.Should().ThrowAsync<BadRequestException>())
                .WithMessage(ErrorConstants.ExaminationMessage.FollowUpAppointmentAlreadyScheduled);
        }
    }
}
