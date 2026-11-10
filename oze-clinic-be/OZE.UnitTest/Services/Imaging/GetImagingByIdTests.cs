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
    // OZ-IMG-03 GetImagingById
    [Trait("Tab", "OZ-IMG-03")]
    public class GetImagingByIdTests : ImagingRequestTestBase
    {
        [Fact]
        public async Task GetByIdAsync_ShouldReturnTheRequestCreatedByTheDoctor()
        {
            var createdAt = new DateTimeOffset(2026, 10, 26, 3, 0, 0, TimeSpan.Zero);
            _staffRepository
                .Setup(r => r.GetByUserIdAsync(DoctorUserId))
                .ReturnsAsync(new StaffProfile { Id = 5, UserId = DoctorUserId });
            _imagingRequestRepository
                .Setup(r => r.GetByIdAsync(99, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ImagingRequest
                {
                    Id = 99,
                    ExaminationId = ExaminationId,
                    RequestedByDoctorId = 5,
                    ImagingType = ImagingRequestConstants.PeriapicalXRay,
                    TargetArea = "Tooth 36",
                    ClinicalIndication = "Check the root",
                    RequestStatus = ImagingRequestConstants.Pending,
                    CreatedAt = createdAt,
                    Examination = ExaminationInProgress()
                });

            var result = await _service.GetByIdAsync(DoctorUserId, 99);

            result.Id.Should().Be(99);
            result.ExaminationId.Should().Be(ExaminationId);
            result.PatientId.Should().Be(3);
            result.ImagingType.Should().Be(ImagingRequestConstants.PeriapicalXRay);
            result.TargetArea.Should().Be("Tooth 36");
            result.ClinicalIndication.Should().Be("Check the root");
            result.RequestStatus.Should().Be(ImagingRequestConstants.Pending);
            result.CreatedAt.Should().Be(createdAt);
        }

        [Fact]
        public async Task GetByIdAsync_ShouldReturnNotFound_WhenRequestDoesNotExist()
        {
            _staffRepository
                .Setup(r => r.GetByUserIdAsync(DoctorUserId))
                .ReturnsAsync(new StaffProfile { Id = 5, UserId = DoctorUserId });
            _imagingRequestRepository
                .Setup(r => r.GetByIdAsync(99, It.IsAny<CancellationToken>()))
                .ReturnsAsync((ImagingRequest?)null);

            var act = () => _service.GetByIdAsync(DoctorUserId, 99);

            var error = await act.Should().ThrowAsync<NotFoundException>();
            error.Which.Message.Should().Be(ErrorConstants.ImagingRequestMessage.RequestNotFound);
        }

        [Fact]
        public async Task GetByIdAsync_ShouldRejectDoctorWhoDidNotCreateTheRequest()
        {
            _staffRepository
                .Setup(r => r.GetByUserIdAsync(DoctorUserId))
                .ReturnsAsync(new StaffProfile { Id = 5, UserId = DoctorUserId });
            _imagingRequestRepository
                .Setup(r => r.GetByIdAsync(99, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ImagingRequest
                {
                    Id = 99,
                    RequestedByDoctorId = 8,
                    Examination = ExaminationInProgress()
                });

            var act = () => _service.GetByIdAsync(DoctorUserId, 99);

            var error = await act.Should().ThrowAsync<ForbiddenException>();
            error.Which.Message.Should().Be(ErrorConstants.ImagingRequestMessage.CannotViewRequest);
        }
    }
}
