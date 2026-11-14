using AutoMapper;
using FluentAssertions;
using Microsoft.Extensions.Caching.Distributed;
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
    // OZ-SVC-05 CreateService
    [Trait("Tab", "OZ-SVC-05")]
    public class CreateServiceTests : ClinicServiceTestBase
    {
        [Fact]
        public async Task CreateServiceAsync_ShouldCreateServiceAndInvalidateCache_WhenValid()
        {
            // Arrange: Seed cache first to verify invalidation
            var activeListKey = "ClinicServices_ActiveList";
            _cache.SetString(activeListKey, "[]");

            var request = new CreateServiceRequest
            {
                ServiceCode = "dv-new",
                ServiceName = " Tram rang ",
                RequiredRoomType = "generaltreatment", // test case-insensitivity
                ReferencePrice = 250000m,
                EstimatedMinutes = 30
            };

            _serviceRepositoryMock
                .Setup(r => r.ExistsByCodeAsync("DV-NEW", null, It.IsAny<CancellationToken>()))
                .ReturnsAsync(false);

            _serviceRepositoryMock
                .Setup(r => r.AddAsync(It.IsAny<Service>(), It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            _serviceRepositoryMock
                .Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            // Act
            var result = await _service.CreateServiceAsync(request);

            // Assert
            result.Success.Should().BeTrue();
            result.Data.Should().NotBeNull();
            result.Data!.ServiceCode.Should().Be("DV-NEW");
            result.Data.ServiceName.Should().Be("Tram rang");
            result.Data.RequiredRoomType.Should().Be("GeneralTreatment"); // normalized to PascalCase

            _cache.GetString(activeListKey).Should().BeNull(); // Cache invalidated
            _serviceRepositoryMock.Verify(r => r.AddAsync(It.Is<Service>(s => s.ServiceCode == "DV-NEW" && s.RequiredRoomType == "GeneralTreatment"), It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task CreateServiceAsync_ShouldFail_WhenCodeAlreadyExists()
        {
            // Arrange
            var request = new CreateServiceRequest
            {
                ServiceCode = "DV-EXIST",
                ServiceName = "Dich vu ton tai",
                ReferencePrice = 100000m
            };

            _serviceRepositoryMock
                .Setup(r => r.ExistsByCodeAsync("DV-EXIST", null, It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);

            // Act
            var result = await _service.CreateServiceAsync(request);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ServiceMessage.ServiceCodeExist);
        }

        [Fact]
        public async Task CreateServiceAsync_ShouldFail_WhenInvalidRoomType()
        {
            // Arrange
            var request = new CreateServiceRequest
            {
                ServiceCode = "DV-INVALID",
                ServiceName = "Dich vu",
                RequiredRoomType = "InvalidRoomType"
            };

            // Act
            var result = await _service.CreateServiceAsync(request);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ServiceMessage.InvalidRoomType);
        }

        [Fact]
        public async Task CreateServiceAsync_ShouldFail_WhenPriceNegative()
        {
            // Arrange
            var request = new CreateServiceRequest
            {
                ServiceCode = "DV-NEG",
                ServiceName = "Dich vu",
                ReferencePrice = -100m
            };

            // Act
            var result = await _service.CreateServiceAsync(request);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ServiceMessage.InvalidPrice);
        }

        [Fact]
        public async Task CreateServiceAsync_ShouldFail_WhenEstimatedMinutesNonPositive()
        {
            // Arrange
            var request = new CreateServiceRequest
            {
                ServiceCode = "DV-MINUTES",
                ServiceName = "Dich vu",
                EstimatedMinutes = 0
            };

            // Act
            var result = await _service.CreateServiceAsync(request);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be(ErrorConstants.ServiceMessage.InvalidEstimatedMinutes);
        }
    }
}
