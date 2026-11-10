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
    // OZ-SVC-01 GetServices
    [Trait("Tab", "OZ-SVC-01")]
    public class GetServicesTests : ClinicServiceTestBase
    {
        [Fact]
        public async Task GetServicesAsync_ShouldReturnPagedServices()
        {
            // Arrange
            var parameters = new ServiceQueryParameters { PageNumber = 1, PageSize = 10 };
            var services = new List<Service>
            {
                new() { Id = 1, ServiceCode = "DV-01", ServiceName = "Kham tong quat", ReferencePrice = 100000m, IsActive = true }
            };
            var pagedResult = new PagedResult<Service>(services, 1, 1, 10);

            _serviceRepositoryMock
                .Setup(r => r.GetAllAsync(parameters, It.IsAny<CancellationToken>()))
                .ReturnsAsync(pagedResult);

            // Act
            var result = await _service.GetServicesAsync(parameters);

            // Assert
            result.Success.Should().BeTrue();
            result.Data.Should().NotBeNull();
            result.Data!.Items.Should().HaveCount(1);
            result.Data.Items[0].ServiceCode.Should().Be("DV-01");
        }
    }
}
