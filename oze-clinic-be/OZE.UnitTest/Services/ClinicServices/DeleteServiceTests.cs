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
    // OZ-SVC-08 DeleteService
    [Trait("Tab", "OZ-SVC-08")]
    public class DeleteServiceTests : ClinicServiceTestBase
    {
        [Fact]
        public async Task DeleteServiceAsync_ShouldDeleteAndInvalidateCache_WhenNotInUse()
        {
            // Arrange
            var service = new Service { Id = 1, ServiceCode = "DV-01", ServiceName = "Dich vu test" };
            _serviceRepositoryMock
                .Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>()))
                .ReturnsAsync(service);

            _serviceRepositoryMock
                .Setup(r => r.IsServiceInUseAsync(1, It.IsAny<CancellationToken>()))
                .ReturnsAsync(false);

            _serviceRepositoryMock
                .Setup(r => r.DeleteAsync(service, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            _serviceRepositoryMock
                .Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            // Act
            var result = await _service.DeleteServiceAsync(1);

            // Assert
            result.Success.Should().BeTrue();
            result.Data.Should().BeTrue();
            _serviceRepositoryMock.Verify(r => r.DeleteAsync(service, It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task DeleteServiceAsync_ShouldFail_WhenServiceInUse()
        {
            // Arrange
            var service = new Service { Id = 1, ServiceCode = "DV-01", ServiceName = "Dich vu test" };
            _serviceRepositoryMock
                .Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>()))
                .ReturnsAsync(service);

            _serviceRepositoryMock
                .Setup(r => r.IsServiceInUseAsync(1, It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);

            // Act
            var result = await _service.DeleteServiceAsync(1);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ServiceMessage.ServiceInUse);
            _serviceRepositoryMock.Verify(r => r.DeleteAsync(It.IsAny<Service>(), It.IsAny<CancellationToken>()), Times.Never);
        }
    }
}
