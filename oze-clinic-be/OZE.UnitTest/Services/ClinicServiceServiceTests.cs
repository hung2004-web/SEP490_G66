using AutoMapper;
using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Moq;
using OZE.Application.Interfaces;
using OZE.Application.MappingProfiles;
using OZE.Application.Services;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;
using Xunit;

namespace OZE.UnitTest.Services
{
    public class ClinicServiceServiceTests
    {
        private readonly Mock<IServiceRepository> _serviceRepositoryMock;
        private readonly Mock<ILogger<ClinicServiceService>> _loggerMock;
        private readonly IMapper _mapper;
        private readonly IMemoryCache _cache;
        private readonly ClinicServiceService _service;

        public ClinicServiceServiceTests()
        {
            _serviceRepositoryMock = new Mock<IServiceRepository>();
            _loggerMock = new Mock<ILogger<ClinicServiceService>>();

            var config = new MapperConfiguration(cfg =>
            {
                cfg.AddProfile<BaseMappingObject>();
            });
            _mapper = config.CreateMapper();

            _cache = new MemoryCache(new MemoryCacheOptions());

            _service = new ClinicServiceService(
                _serviceRepositoryMock.Object,
                _mapper,
                _loggerMock.Object,
                _cache);
        }

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

        [Fact]
        public async Task CreateServiceAsync_ShouldCreateServiceAndInvalidateCache_WhenValid()
        {
            // Arrange: Seed cache first to verify invalidation
            var activeListKey = "ClinicServices_ActiveList";
            _cache.Set(activeListKey, new List<ServiceDto>());

            var request = new CreateServiceRequest
            {
                ServiceCode = "dv-new",
                ServiceName = " Tram rang ",
                RequiredRoomType = "treatment", // test case-insensitivity
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
            result.Data.RequiredRoomType.Should().Be("Treatment"); // normalized to PascalCase

            _cache.TryGetValue(activeListKey, out _).Should().BeFalse(); // Cache invalidated
            _serviceRepositoryMock.Verify(r => r.AddAsync(It.Is<Service>(s => s.ServiceCode == "DV-NEW" && s.RequiredRoomType == "Treatment"), It.IsAny<CancellationToken>()), Times.Once);
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
                RequiredRoomType = "imaging",
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
            result.Data.RequiredRoomType.Should().Be("Imaging");
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
