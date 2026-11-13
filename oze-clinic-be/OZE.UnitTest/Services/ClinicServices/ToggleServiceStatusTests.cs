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
    // OZ-SVC-07 ToggleServiceStatus
    [Trait("Tab", "OZ-SVC-07")]
    public class ToggleServiceStatusTests : ClinicServiceTestBase
    {
        [Fact]
        public async Task ToggleServiceStatusAsync_ShouldToggleStatusAndInvalidateCache()
        {
            // Arrange
            var service = new Service { Id = 1, ServiceCode = "DV-01", ServiceName = "Lay cao rang", IsActive = true };
            _serviceRepositoryMock
                .Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>()))
                .ReturnsAsync(service);

            _serviceRepositoryMock
                .Setup(r => r.UpdateAsync(service, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            _serviceRepositoryMock
                .Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            // Act
            var result = await _service.ToggleServiceStatusAsync(1, false);

            // Assert
            result.Success.Should().BeTrue();
            result.Data.Should().NotBeNull();
            result.Data!.IsActive.Should().BeFalse();
            _serviceRepositoryMock.Verify(r => r.UpdateAsync(service, It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task ToggleServiceStatusAsync_ShouldShortCircuit_WhenStatusUnchanged()
        {
            // Arrange
            var service = new Service { Id = 1, ServiceCode = "DV-01", ServiceName = "Lay cao rang", IsActive = true };
            _serviceRepositoryMock
                .Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>()))
                .ReturnsAsync(service);

            // Act: Toggle to true when already true
            var result = await _service.ToggleServiceStatusAsync(1, true);

            // Assert
            result.Success.Should().BeTrue();
            result.Data.Should().NotBeNull();
            result.Data!.IsActive.Should().BeTrue();

            // Should NOT execute Update or SaveChanges
            _serviceRepositoryMock.Verify(r => r.UpdateAsync(It.IsAny<Service>(), It.IsAny<CancellationToken>()), Times.Never);
            _serviceRepositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        }
    }
}
