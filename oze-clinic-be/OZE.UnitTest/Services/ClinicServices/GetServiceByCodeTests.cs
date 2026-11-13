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
    // OZ-SVC-04 GetServiceByCode
    [Trait("Tab", "OZ-SVC-04")]
    public class GetServiceByCodeTests : ClinicServiceTestBase
    {
        [Fact]
        public async Task GetServiceByCodeAsync_ShouldReturnService_WhenExists()
        {
            // Arrange
            var service = new Service { Id = 1, ServiceCode = "DV-01", ServiceName = "Nho rang" };
            _serviceRepositoryMock
                .Setup(r => r.GetByCodeAsync("DV-01", It.IsAny<CancellationToken>()))
                .ReturnsAsync(service);

            // Act
            var result = await _service.GetServiceByCodeAsync("DV-01");

            // Assert
            result.Success.Should().BeTrue();
            result.Data.Should().NotBeNull();
            result.Data!.ServiceCode.Should().Be("DV-01");
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData(null)]
        public async Task GetServiceByCodeAsync_ShouldReturnFailure_WhenCodeIsInvalid(string? code)
        {
            // Act
            var result = await _service.GetServiceByCodeAsync(code!);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ServiceMessage.ServiceNotFound);
        }
    }
}
