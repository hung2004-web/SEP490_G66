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
    // OZ-IMG-04 GetImagingQueue
    [Trait("Tab", "OZ-IMG-04")]
    public class GetImagingQueueTests : ImagingRequestTestBase
    {
        [Fact]
        public async Task GetQueueAsync_ShouldReturnPendingAndInProgressRequestsInRequestTimeOrder()
        {
            var earlier = new DateTimeOffset(2026, 10, 26, 1, 0, 0, TimeSpan.Zero);
            var later = earlier.AddHours(1);
            _imagingRequestRepository
                .Setup(r => r.GetQueueAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<ImagingRequest>
                {
                    QueueRequest(2, ImagingRequestConstants.InProgress, later, "Minh Tran", "Dr An"),
                    QueueRequest(3, ImagingRequestConstants.Cancelled, earlier.AddMinutes(30), "Other", "Dr An"),
                    QueueRequest(1, ImagingRequestConstants.Pending, earlier, "Lan Nguyen", "Dr Binh")
                });

            var result = await _service.GetQueueAsync();

            result.Select(item => item.Id).Should().Equal(1, 2);
            result[0].PatientName.Should().Be("Lan Nguyen");
            result[0].DoctorName.Should().Be("Dr Binh");
            result[0].ImagingType.Should().Be(ImagingRequestConstants.Panoramic);
            result[0].TargetArea.Should().Be("Tooth 36");
            result[0].ClinicalIndication.Should().Be("Check the root");
            result[0].RequestStatus.Should().Be(ImagingRequestConstants.Pending);
            result[0].CreatedAt.Should().Be(earlier);
            result[1].RequestStatus.Should().Be(ImagingRequestConstants.InProgress);
            result[1].PatientId.Should().Be(3);
        }

        [Fact]
        public async Task GetQueueAsync_ShouldReturnEmptyList_WhenNoRequestIsWaiting()
        {
            _imagingRequestRepository
                .Setup(r => r.GetQueueAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<ImagingRequest>());

            var result = await _service.GetQueueAsync();

            result.Should().BeEmpty();
        }
    }
}
