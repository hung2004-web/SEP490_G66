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
    // OZ-SVC-03 GetServiceById
    [Trait("Tab", "OZ-SVC-03")]
    public class GetServiceByIdTests : ClinicServiceTestBase
    {
        [Fact]
        public async Task GetServiceByIdAsync_ShouldReturnService_WhenExists()
        {
            // Arrange
            var service = new Service { Id = 1, ServiceCode = "DV-01", ServiceName = "Nho rang" };
            _serviceRepositoryMock
                .Setup(r => r.GetByIdAsync(1, true, It.IsAny<CancellationToken>()))
                .ReturnsAsync(service);

            // Act
            var result = await _service.GetServiceByIdAsync(1);

            // Assert
            result.Success.Should().BeTrue();
            result.Data.Should().NotBeNull();
            result.Data!.Id.Should().Be(1);
            result.Data.ServiceName.Should().Be("Nho rang");
        }

        [Fact]
        public async Task GetServiceByIdAsync_ShouldReturnFailure_WhenNotFound()
        {
            // Arrange
            _serviceRepositoryMock
                .Setup(r => r.GetByIdAsync(999, true, It.IsAny<CancellationToken>()))
                .ReturnsAsync((Service?)null);

            // Act
            var result = await _service.GetServiceByIdAsync(999);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ServiceMessage.ServiceNotFound);
        }
    }
}
