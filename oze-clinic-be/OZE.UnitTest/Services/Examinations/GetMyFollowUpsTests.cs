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
    // OZ-EXAM-25 GetMyFollowUps
    [Trait("Tab", "OZ-EXAM-25")]
    public class GetMyFollowUpsTests : ExaminationFollowUpTestBase
    {
        [Fact]
        public async Task GetMyFollowUpsAsync_ShouldReturnPatientFollowUps()
        {
            var patient = new Patient { Id = 5, UserId = "patient-1" };
            var exam = CreateTestExamination();
            exam.FollowUpDate = DateOnly.FromDateTime(ClinicClock.Today.AddDays(7));

            _examinationRepoMock
                .Setup(r => r.GetPatientByUserIdAsync("patient-1", It.IsAny<CancellationToken>()))
                .ReturnsAsync(patient);

            _examinationRepoMock
                .Setup(r => r.GetPatientFollowUpsAsync(patient.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Examination> { exam });

            var result = await _service.GetMyFollowUpsAsync("patient-1");

            result.Should().NotBeNull();
            result.Should().HaveCount(1);
            result[0].ExaminationId.Should().Be(exam.Id);
        }
    }
}
