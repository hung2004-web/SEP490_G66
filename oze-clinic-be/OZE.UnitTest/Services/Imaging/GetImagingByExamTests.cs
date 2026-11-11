using FluentAssertions;
using Moq;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Exceptions;
using OZE.Common.Models;
using OZE.Domain.Entities;

namespace OZE.UnitTest.Services.Imaging
{
    // OZ-IMG-02 GetImagingByExam
    [Trait("Tab", "OZ-IMG-02")]
    public class GetImagingByExamTests : ImagingRequestTestBase
    {
        [Fact]
        public async Task GetByExaminationAsync_ShouldReturnRequestsWithStatus()
        {
            var earlier = new DateTimeOffset(2026, 10, 26, 2, 0, 0, TimeSpan.Zero);
            var later = earlier.AddMinutes(15);
            SetupReadyExamination();
            _imagingRequestRepository
                .Setup(r => r.GetByExaminationIdAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<ImagingRequest>
                {
                    new()
                    {
                        Id = 2,
                        ExaminationId = ExaminationId,
                        ImagingType = ImagingRequestConstants.Cbct,
                        TargetArea = "Full arch",
                        ClinicalIndication = "Implant plan",
                        RequestStatus = ImagingRequestConstants.Pending,
                        CreatedAt = later
                    },
                    new()
                    {
                        Id = 1,
                        ExaminationId = ExaminationId,
                        ImagingType = ImagingRequestConstants.Panoramic,
                        TargetArea = "Tooth 36",
                        ClinicalIndication = "Check the root",
                        RequestStatus = ImagingRequestConstants.Cancelled,
                        CreatedAt = earlier
                    }
                });

            var result = await _service.GetByExaminationAsync(DoctorUserId, ExaminationId);

            result.Should().HaveCount(2);
            result[0].RequestStatus.Should().Be(ImagingRequestConstants.Cancelled);
            result[1].ImagingType.Should().Be(ImagingRequestConstants.Cbct);
            result[1].TargetArea.Should().Be("Full arch");
            result[1].ClinicalIndication.Should().Be("Implant plan");
            result[1].RequestStatus.Should().Be(ImagingRequestConstants.Pending);
            result[1].CreatedAt.Should().Be(later);
            result[1].PatientId.Should().Be(3);
        }

        [Fact]
        public async Task GetByExaminationAsync_ShouldReturnEmptyList_WhenExaminationHasNoRequests()
        {
            var examination = ExaminationInProgress();
            examination.ExaminationStatus = ImagingRequestConstants.Completed;
            SetupReadyExamination(examination);
            _imagingRequestRepository
                .Setup(r => r.GetByExaminationIdAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<ImagingRequest>());

            var result = await _service.GetByExaminationAsync(DoctorUserId, ExaminationId);

            result.Should().BeEmpty();
        }

        [Fact]
        public async Task GetByExaminationAsync_ShouldRejectDoctorWhoIsNotExaminingThisVisit()
        {
            var examination = ExaminationInProgress();
            examination.DoctorId = 8;
            SetupReadyExamination(examination);

            var act = () => _service.GetByExaminationAsync(DoctorUserId, ExaminationId);

            var error = await act.Should().ThrowAsync<ForbiddenException>();
            error.Which.Message.Should().Be(ErrorConstants.ImagingRequestMessage.CannotViewRequests);
        }

        [Fact]
        public async Task GetByExaminationAsync_ShouldReturnNotFound_WhenExaminationDoesNotExist()
        {
            _staffRepository
                .Setup(r => r.GetByUserIdAsync(DoctorUserId))
                .ReturnsAsync(new StaffProfile { Id = 5, UserId = DoctorUserId });
            _imagingRequestRepository
                .Setup(r => r.GetExaminationAsync(ExaminationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync((Examination?)null);

            var act = () => _service.GetByExaminationAsync(DoctorUserId, ExaminationId);

            var error = await act.Should().ThrowAsync<NotFoundException>();
            error.Which.Message.Should().Be(ErrorConstants.MedicalRecordMessage.ExaminationNotFound);
        }
    }
}
