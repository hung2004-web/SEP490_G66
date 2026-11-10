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
    // OZ-SVC-02 GetActiveServices
    [Trait("Tab", "OZ-SVC-02")]
    public class GetActiveServicesTests : ClinicServiceTestBase
    {
        [Fact]
        public async Task GetActiveServicesAsync_ShouldCacheResults()
        {
            // Arrange
            var activeServices = new List<Service>
            {
                new() { Id = 1, ServiceCode = "DV-01", ServiceName = "Kham tong quat", IsActive = true }
            };

            _serviceRepositoryMock
                .Setup(r => r.GetActiveServicesAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync(activeServices);

            // Act 1: First call should query repository and cache
            var firstResult = await _service.GetActiveServicesAsync();

            // Act 2: Second call should retrieve from cache
            var secondResult = await _service.GetActiveServicesAsync();

            // Assert
            firstResult.Success.Should().BeTrue();
            secondResult.Success.Should().BeTrue();
            firstResult.Data.Should().HaveCount(1);
            secondResult.Data.Should().HaveCount(1);

            // Repository should only be queried once
            _serviceRepositoryMock.Verify(r => r.GetActiveServicesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }
    }
}
