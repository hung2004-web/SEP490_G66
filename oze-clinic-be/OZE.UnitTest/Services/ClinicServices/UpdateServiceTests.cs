using AutoMapper;
using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Moq;
using OZE.Application.Interfaces;
using OZE.Application.MappingProfiles;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Models.Base;
using OZE.Common.Models;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services.ClinicServices
{
    // OZ-SVC-06 UpdateService
    [Trait("Tab", "OZ-SVC-06")]
    public class UpdateServiceTests : ClinicServiceTestBase
    {
        [Fact]
        public async Task UpdateServiceAsync_ShouldUpdateServiceAndInvalidateCache_WhenValid()
        {
            // Arrange
            var existingService = new Service
            {
                Id = 5,
                ServiceCode = "DV-05",
                ServiceName = "Old name",
                ReferencePrice = 100000m,
                IsActive = true
            };

            var request = new UpdateServiceRequest
            {
                ServiceCode = "DV-05-NEW",
                ServiceName = "New Name",
                ReferencePrice = 200000m,
                RequiredRoomType = "xray",
                EstimatedMinutes = 45,
                IsActive = true
            };

            _serviceRepositoryMock
                .Setup(r => r.GetByIdAsync(5, It.IsAny<CancellationToken>()))
                .ReturnsAsync(existingService);

            _serviceRepositoryMock
                .Setup(r => r.ExistsByCodeAsync("DV-05-NEW", 5, It.IsAny<CancellationToken>()))
                .ReturnsAsync(false);

            _serviceRepositoryMock
                .Setup(r => r.UpdateAsync(existingService, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            _serviceRepositoryMock
                .Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            // Act
            var result = await _service.UpdateServiceAsync(5, request);

            // Assert
            result.Success.Should().BeTrue();
            result.Data.Should().NotBeNull();
            result.Data!.ServiceCode.Should().Be("DV-05-NEW");
            result.Data.ServiceName.Should().Be("New Name");
            result.Data.RequiredRoomType.Should().Be("XRay");
            result.Data.ReferencePrice.Should().Be(200000m);
        }

        [Fact]
        public async Task UpdateServiceAsync_ShouldFail_WhenNotFound()
        {
            // Arrange
            _serviceRepositoryMock
                .Setup(r => r.GetByIdAsync(999, It.IsAny<CancellationToken>()))
                .ReturnsAsync((Service?)null);

            // Act
            var result = await _service.UpdateServiceAsync(999, new UpdateServiceRequest());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ServiceMessage.ServiceNotFound);
        }
    }
}
