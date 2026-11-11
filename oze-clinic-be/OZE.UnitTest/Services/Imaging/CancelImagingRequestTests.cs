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
    // OZ-IMG-05 CancelImagingRequest
    [Trait("Tab", "OZ-IMG-05")]
    public class CancelImagingRequestTests : ImagingRequestTestBase
    {
        [Fact]
        public async Task CancelAsync_ShouldCancelPendingRequest_AndKeepClinicalNotes()
        {
            var imagingRequest = PendingRequest();
            imagingRequest.Notes = "Clinical note";
            _staffRepository
                .Setup(r => r.GetByUserIdAsync(DoctorUserId))
                .ReturnsAsync(new StaffProfile { Id = 5, UserId = DoctorUserId });
            _imagingRequestRepository
                .Setup(r => r.GetTrackedByIdAsync(99, It.IsAny<CancellationToken>()))
                .ReturnsAsync(imagingRequest);
            _imagingRequestRepository
                .Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            var result = await _service.CancelAsync(DoctorUserId, 99, new CancelImagingRequest
            {
                CancelReason = "  Patient left  "
            });

            imagingRequest.RequestStatus.Should().Be(ImagingRequestConstants.Cancelled);
            imagingRequest.CancelReason.Should().Be("Patient left");
            imagingRequest.Notes.Should().Be("Clinical note");
            imagingRequest.UpdatedAt.Should().NotBeNull();
            result.RequestStatus.Should().Be(ImagingRequestConstants.Cancelled);
            result.CancelReason.Should().Be("Patient left");
            result.PatientId.Should().Be(3);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        public async Task CancelAsync_ShouldRejectMissingReason(string? reason)
        {
            SetupPendingRequest();

            var act = () => _service.CancelAsync(DoctorUserId, 99, new CancelImagingRequest { CancelReason = reason });

            var error = await act.Should().ThrowAsync<BadRequestException>();
            error.Which.Message.Should().Be(ErrorConstants.ImagingRequestMessage.CancelReasonRequired);
            _imagingRequestRepository.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        }

        [Theory]
        [InlineData("InProgress")]
        [InlineData("Completed")]
        [InlineData("Cancelled")]
        public async Task CancelAsync_ShouldRejectRequestThatIsNotPending(string status)
        {
            var imagingRequest = PendingRequest();
            imagingRequest.RequestStatus = status;
            SetupPendingRequest(imagingRequest);

            var act = () => _service.CancelAsync(DoctorUserId, 99, new CancelImagingRequest { CancelReason = "No longer needed" });

            var error = await act.Should().ThrowAsync<BadRequestException>();
            error.Which.Message.Should().Be($"Cannot cancel imaging request because the imaging request is {status}.");
            imagingRequest.CancelReason.Should().BeNull();
        }

        [Fact]
        public async Task CancelAsync_ShouldRejectDoctorWhoDidNotCreateTheRequest()
        {
            var imagingRequest = PendingRequest();
            imagingRequest.RequestedByDoctorId = 8;
            SetupPendingRequest(imagingRequest);

            var act = () => _service.CancelAsync(DoctorUserId, 99, new CancelImagingRequest { CancelReason = "No longer needed" });

            var error = await act.Should().ThrowAsync<ForbiddenException>();
            error.Which.Message.Should().Be(ErrorConstants.ImagingRequestMessage.CannotCancelRequest);
        }

        [Fact]
        public async Task CancelAsync_ShouldReturnNotFound_WhenRequestDoesNotExist()
        {
            _staffRepository
                .Setup(r => r.GetByUserIdAsync(DoctorUserId))
                .ReturnsAsync(new StaffProfile { Id = 5, UserId = DoctorUserId });
            _imagingRequestRepository
                .Setup(r => r.GetTrackedByIdAsync(99, It.IsAny<CancellationToken>()))
                .ReturnsAsync((ImagingRequest?)null);

            var act = () => _service.CancelAsync(DoctorUserId, 99, new CancelImagingRequest { CancelReason = "No longer needed" });

            var error = await act.Should().ThrowAsync<NotFoundException>();
            error.Which.Message.Should().Be(ErrorConstants.ImagingRequestMessage.RequestNotFound);
        }
    }
}
